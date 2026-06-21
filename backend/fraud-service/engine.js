'use strict';

/**
 * Explainable Fraud Detection Engine
 *
 * Rule-based risk scorer. Every decision is fully deterministic and
 * traceable — no black-box predictions. Each rule documents:
 *   - what it detects
 *   - why a signal was flagged
 *   - its confidence and weight contribution
 *
 * Rules implemented:
 *   1. RAPID_FIRE          — request rate per IP
 *   2. PAYLOAD_ANOMALY     — statistical z-score on transaction amount
 *   3. TIME_BASED          — off-hours high-value transactions
 *   4. SEQUENTIAL_PATTERN  — replay attack (identical payload hash)
 *   5. CREDENTIAL_STUFFING — many distinct userIds from one IP
 *   6. BURST_TRANSFER      — multiple transfers to same recipient rapidly
 *   7. VELOCITY_SPIKE      — sudden acceleration vs. rolling baseline
 */

const crypto = require('crypto');
const config  = require('../shared/config').fraud;

const C  = config.thresholds;
const RW = config.rules;

class FraudDetectionEngine {
  constructor() {
    // Per-IP request timestamps  [ip → [ts, ...]]
    this._ipTimestamps  = new Map();
    // Per-IP set of userIds seen  [ip → { userId → [ts, ...] }]
    this._ipUserIds     = new Map();
    // Payload hash → [ts, ...]
    this._payloadHashes = new Map();
    // Rolling transaction amounts for statistical baseline
    this._amounts       = [];
    // Per (userId+recipientId) timestamps
    this._transfers     = new Map();
    // Per-IP rolling request counts for velocity baseline
    this._velocityBaseline = new Map();   // ip → { baseline, samples }
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Analyse a request and return a full risk decision.
   *
   * @param {object} requestData
   * @param {string} requestData.correlationId
   * @param {string} requestData.ipAddress
   * @param {string} requestData.endpoint
   * @param {string} requestData.method
   * @param {object} requestData.body
   * @returns {RiskDecision}
   */
  analyze(requestData) {
    const feat = this._extractFeatures(requestData);

    const triggered = [];

    const run = (enabled, fn) => {
      if (!enabled) return;
      const result = fn(feat);
      if (result.triggered) triggered.push(result);
    };

    run(RW.RAPID_FIRE.enabled,          () => this._rapidFire(feat));
    run(RW.PAYLOAD_ANOMALY.enabled,     () => this._payloadAnomaly(feat));
    run(RW.TIME_BASED.enabled,          () => this._timeBased(feat));
    run(feat.hasBody && RW.SEQUENTIAL_PATTERN.enabled,  () => this._sequentialPattern(feat));
    run(RW.CREDENTIAL_STUFFING.enabled, () => this._credentialStuffing(feat));
    run(RW.BURST_TRANSFER.enabled && feat.amount > 0 && feat.recipient, () => this._burstTransfer(feat));
    run(RW.VELOCITY_SPIKE.enabled,      () => this._velocitySpike(feat));

    this._updateHistory(feat);

    const rawScore  = triggered.reduce((s, r) => s + r.score, 0);
    const riskScore = Math.min(100, rawScore);
    const riskLevel = this._riskLevel(riskScore);
    const recommendation = this._recommendation(riskScore, feat);
    const confidence     = this._confidence(triggered, riskScore);

    return {
      correlationId:  feat.correlationId,
      timestamp:      feat.timestamp,
      riskScore,
      riskLevel,
      confidence,
      recommendation,
      triggeredRules: triggered,
      reasons:        triggered.map(r => r.reasoning),
      explanation:    this._explain(triggered, riskScore),
      metadata: {
        ipAddress: feat.ipAddress,
        endpoint:  feat.endpoint,
        method:    feat.method,
        userId:    feat.userId
      }
    };
  }

  /** Clear all in-memory state (used when metrics are reset). */
  clearHistory() {
    this._ipTimestamps.clear();
    this._ipUserIds.clear();
    this._payloadHashes.clear();
    this._amounts        = [];
    this._transfers.clear();
    this._velocityBaseline.clear();
  }

  /** Diagnostic snapshot. */
  stats() {
    return {
      trackedIPs:           this._ipTimestamps.size,
      transactionSamples:   this._amounts.length,
      activePatterns:       this._payloadHashes.size,
      trackedTransfers:     this._transfers.size,
      velocityBaselines:    this._velocityBaseline.size
    };
  }

  // ── feature extraction ──────────────────────────────────────────────────────

  _extractFeatures(req) {
    const now  = Date.now();
    const hour = new Date(now).getHours();
    const body = req.body || {};

    return {
      correlationId:   req.correlationId,
      timestamp:       new Date(now).toISOString(),
      now,
      ipAddress:       req.ipAddress || '127.0.0.1',
      endpoint:        req.endpoint  || '',
      method:          req.method    || 'GET',
      body,
      hasBody:         Object.keys(body).length > 0,
      hourOfDay:       hour,
      isBusinessHours: hour >= 9 && hour <= 21,
      amount:          Number(body.amount) || 0,
      userId:          String(body.userId  || 'anonymous'),
      recipient:       String(body.recipient || '')
    };
  }

  // ── rules ────────────────────────────────────────────────────────────────────

  /** Rule 1: Rapid fire — too many requests from one IP in the sliding window. */
  _rapidFire(feat) {
    const { ipAddress: ip, now } = feat;
    const win = C.rapidFireWindowMs;

    if (!this._ipTimestamps.has(ip)) this._ipTimestamps.set(ip, []);
    const ts = this._ipTimestamps.get(ip);
    ts.push(now);
    const recent = ts.filter(t => now - t < win);
    this._ipTimestamps.set(ip, recent);
    const count = recent.length;

    if (count > C.rapidFireCount * 1.5) {
      return this._hit('RAPID_FIRE', 'CRITICAL', 0.97,
        RW.RAPID_FIRE.weight + Math.min(40, (count - C.rapidFireCount) * 2),
        `${count} requests in ${win / 1000}s from ${ip} (threshold: ${C.rapidFireCount})`);
    }
    if (count > C.rapidFireCount) {
      return this._hit('RAPID_FIRE', 'HIGH', 0.92,
        RW.RAPID_FIRE.weight,
        `${count} requests in ${win / 1000}s from ${ip} (threshold: ${C.rapidFireCount})`);
    }
    if (count > C.rapidFireCount * 0.6) {
      return this._hit('RAPID_FIRE', 'MEDIUM', 0.70,
        Math.round(RW.RAPID_FIRE.weight * 0.5),
        `Elevated activity: ${count} requests in ${win / 1000}s from ${ip}`);
    }
    return { triggered: false };
  }

  /** Rule 2: Payload anomaly — transaction amount is a statistical outlier. */
  _payloadAnomaly(feat) {
    const { amount } = feat;
    if (!amount) return { triggered: false };

    this._amounts.push(amount);
    if (this._amounts.length > 200) this._amounts.shift();
    if (this._amounts.length < 10) return { triggered: false };

    const mean   = this._amounts.reduce((a, b) => a + b, 0) / this._amounts.length;
    const stdDev = Math.sqrt(
      this._amounts.reduce((s, v) => s + (v - mean) ** 2, 0) / this._amounts.length
    );
    if (stdDev === 0) return { triggered: false };

    const z = (amount - mean) / stdDev;

    if (Math.abs(z) > C.payloadZScoreHigh) {
      return this._hit('PAYLOAD_ANOMALY', 'HIGH', 0.88,
        RW.PAYLOAD_ANOMALY.weight + 15,
        `Amount $${amount} is ${z.toFixed(1)}σ from rolling mean $${mean.toFixed(0)}`);
    }
    if (Math.abs(z) > C.payloadZScoreMedium) {
      return this._hit('PAYLOAD_ANOMALY', 'MEDIUM', 0.74,
        RW.PAYLOAD_ANOMALY.weight,
        `Amount $${amount} is ${z.toFixed(1)}σ from rolling mean $${mean.toFixed(0)}`);
    }
    return { triggered: false };
  }

  /** Rule 3: Time-based — large transaction during off-business hours. */
  _timeBased(feat) {
    const { isBusinessHours, amount, hourOfDay } = feat;
    if (isBusinessHours || amount <= 1000) return { triggered: false };

    const sev   = amount > 5000 ? 'HIGH' : 'MEDIUM';
    const score = sev === 'HIGH'
      ? RW.TIME_BASED.weight + 10
      : RW.TIME_BASED.weight;

    return this._hit('TIME_BASED', sev, 0.85, score,
      `$${amount} transaction at ${hourOfDay}:00 (outside 09:00–21:00 business window)`);
  }

  /** Rule 4: Sequential pattern — identical payload hash repeated within window. */
  _sequentialPattern(feat) {
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(feat.body))
      .digest('hex');
    const { now } = feat;
    const win     = C.sequentialWindowMs;

    if (!this._payloadHashes.has(hash)) this._payloadHashes.set(hash, []);
    const occ = this._payloadHashes.get(hash);
    occ.push(now);
    const recent = occ.filter(t => now - t < win);
    this._payloadHashes.set(hash, recent);

    if (recent.length >= C.sequentialCountHigh) {
      return this._hit('SEQUENTIAL_PATTERN', 'HIGH', 0.93,
        RW.SEQUENTIAL_PATTERN.weight + 15,
        `Identical payload submitted ${recent.length}× in ${win / 60_000} min (replay attack)`);
    }
    if (recent.length >= C.sequentialCountMedium) {
      return this._hit('SEQUENTIAL_PATTERN', 'MEDIUM', 0.78,
        RW.SEQUENTIAL_PATTERN.weight,
        `Identical payload submitted ${recent.length}× in ${win / 60_000} min`);
    }
    return { triggered: false };
  }

  /**
   * Rule 5: Credential stuffing — multiple distinct userIds from the same IP.
   * Signals an account enumeration or credential stuffing attempt.
   */
  _credentialStuffing(feat) {
    const { ipAddress: ip, userId, now } = feat;
    if (userId === 'anonymous') return { triggered: false };

    const win = C.credentialStuffingWindowMs;
    if (!this._ipUserIds.has(ip)) this._ipUserIds.set(ip, new Map());

    const userMap = this._ipUserIds.get(ip);
    if (!userMap.has(userId)) userMap.set(userId, []);
    userMap.get(userId).push(now);

    // prune stale userIds
    for (const [uid, ts] of userMap) {
      const fresh = ts.filter(t => now - t < win);
      if (fresh.length === 0) userMap.delete(uid);
      else userMap.set(uid, fresh);
    }

    const distinctUsers = userMap.size;
    if (distinctUsers >= C.credentialStuffingCount) {
      return this._hit('CREDENTIAL_STUFFING', 'HIGH', 0.87,
        RW.CREDENTIAL_STUFFING.weight + 10,
        `${distinctUsers} distinct userIds from ${ip} in ${win / 60_000} min — possible credential stuffing`);
    }
    if (distinctUsers >= Math.ceil(C.credentialStuffingCount * 0.6)) {
      return this._hit('CREDENTIAL_STUFFING', 'MEDIUM', 0.65,
        Math.round(RW.CREDENTIAL_STUFFING.weight * 0.6),
        `${distinctUsers} distinct userIds from ${ip} in ${win / 60_000} min — elevated account enumeration`);
    }
    return { triggered: false };
  }

  /**
   * Rule 6: Burst transfer — same user sends multiple payments to the same
   * recipient in a short window (money mule / structured payment pattern).
   */
  _burstTransfer(feat) {
    const { userId, recipient, now } = feat;
    if (!recipient) return { triggered: false };

    const key = `${userId}→${recipient}`;
    const win = C.burstTransferWindowMs;

    if (!this._transfers.has(key)) this._transfers.set(key, []);
    const ts = this._transfers.get(key);
    ts.push(now);
    const recent = ts.filter(t => now - t < win);
    this._transfers.set(key, recent);

    if (recent.length >= C.burstTransferCount) {
      return this._hit('BURST_TRANSFER', 'HIGH', 0.84,
        RW.BURST_TRANSFER.weight + 10,
        `${recent.length} transfers from user ${userId} to ${recipient} in ${win / 1000}s`);
    }
    if (recent.length >= 2) {
      return this._hit('BURST_TRANSFER', 'LOW', 0.55,
        Math.round(RW.BURST_TRANSFER.weight * 0.4),
        `${recent.length} transfers from user ${userId} to ${recipient} in ${win / 1000}s`);
    }
    return { triggered: false };
  }

  /**
   * Rule 7: Velocity spike — request rate has jumped significantly above
   * the IP's own rolling baseline (catches distributed slow-rate attacks).
   */
  _velocitySpike(feat) {
    const { ipAddress: ip, now } = feat;
    const recentCount = (this._ipTimestamps.get(ip) || []).filter(t => now - t < 10_000).length;

    if (!this._velocityBaseline.has(ip)) {
      this._velocityBaseline.set(ip, { ema: recentCount, samples: 0 });
      return { triggered: false };
    }

    const state  = this._velocityBaseline.get(ip);
    const alpha  = 0.3;
    const newEma = alpha * recentCount + (1 - alpha) * state.ema;
    state.samples++;
    state.ema = newEma;

    if (state.samples < 5) return { triggered: false }; // warm-up period

    const spike = newEma / (state.ema || 1);
    if (spike >= C.velocitySpikeMultiplier * 1.5) {
      return this._hit('VELOCITY_SPIKE', 'HIGH', 0.75,
        RW.VELOCITY_SPIKE.weight + 10,
        `Request velocity from ${ip} is ${spike.toFixed(1)}× above baseline`);
    }
    if (spike >= C.velocitySpikeMultiplier) {
      return this._hit('VELOCITY_SPIKE', 'MEDIUM', 0.60,
        RW.VELOCITY_SPIKE.weight,
        `Request velocity from ${ip} is ${spike.toFixed(1)}× above baseline`);
    }
    return { triggered: false };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  _hit(ruleId, severity, confidence, score, reasoning) {
    const names = {
      RAPID_FIRE:          'Rapid Request Detection',
      PAYLOAD_ANOMALY:     'Statistical Amount Outlier',
      TIME_BASED:          'Temporal Anomaly Detection',
      SEQUENTIAL_PATTERN:  'Replay Attack Detection',
      CREDENTIAL_STUFFING: 'Credential Stuffing Detection',
      BURST_TRANSFER:      'Burst Transfer Detection',
      VELOCITY_SPIKE:      'Velocity Spike Detection'
    };
    return {
      triggered:  true,
      ruleId,
      ruleName:   names[ruleId] || ruleId,
      severity,
      confidence,
      score:      Math.min(score, 95),
      reasoning
    };
  }

  _riskLevel(score) {
    const t = config.thresholds;
    if (score >= t.highRiskScore)   return 'HIGH_RISK';
    if (score >= t.suspiciousScore) return 'SUSPICIOUS';
    return 'NORMAL';
  }

  _recommendation(score, feat) {
    const t = config.thresholds;
    if (score >= t.highRiskScore) {
      return feat.endpoint.includes('payment')
        ? 'BLOCK_AND_VERIFY'
        : 'REQUIRE_ADDITIONAL_AUTH';
    }
    if (score >= 40) return 'ALLOW_WITH_MONITORING';
    return 'ALLOW_NORMAL';
  }

  _confidence(triggered, score) {
    if (triggered.length === 0) return 1.0;   // 100% confident it's clean
    const avg = triggered.reduce((s, r) => s + r.confidence, 0) / triggered.length;
    // More rules → higher confidence in the fraud verdict
    const multi = Math.min(1, 0.6 + triggered.length * 0.1);
    return Math.round(Math.min(0.99, avg * multi) * 100) / 100;
  }

  _explain(triggered, score) {
    if (triggered.length === 0) return 'No anomalies detected — request appears legitimate.';
    const critical = triggered.find(r => r.severity === 'CRITICAL');
    const high     = triggered.find(r => r.severity === 'HIGH');
    const primary  = critical || high || triggered[0];
    const extra    = triggered.length > 1 ? ` (+${triggered.length - 1} additional indicator${triggered.length > 2 ? 's' : ''})` : '';
    return `${primary.reasoning}${extra}.`;
  }

  _updateHistory(feat) {
    // Amounts rolling window already maintained in _payloadAnomaly
    // IP timestamps already maintained in _rapidFire and _velocitySpike
  }
}

module.exports = FraudDetectionEngine;
