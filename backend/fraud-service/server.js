'use strict';

const express    = require('express');
const { z }      = require('zod');
const createLogger = require('../shared/logger');
const config     = require('../shared/config');
const FraudDetectionEngine = require('./engine');

const log    = createLogger('fraud-service');
const app    = express();
const engine = new FraudDetectionEngine();

// ── tracking for /stats ───────────────────────────────────────────────────────

const startTime = Date.now();
let totalAnalyses = 0;
const ruleHits = {};
const scoreDistribution = { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 };
const latencySamples = [];

// ── middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '64kb' }));

app.use((req, res, next) => {
  req._start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - req._start;
    log.debug({ method: req.method, path: req.path, status: res.statusCode, ms }, 'request');
  });
  next();
});

// ── request schema ────────────────────────────────────────────────────────────

const AnalyzeSchema = z.object({
  correlationId: z.string().min(1),
  ipAddress:     z.string().min(1),
  endpoint:      z.string().min(1),
  method:        z.string().min(1),
  body:          z.record(z.unknown()).optional().default({})
});

// ── routes ────────────────────────────────────────────────────────────────────

/**
 * POST /analyze
 *
 * Analyze a request for fraud signals.
 *
 * Body: { correlationId, ipAddress, endpoint, method, body? }
 * Returns: full RiskDecision object
 */
app.post('/analyze', (req, res) => {
  const t0 = Date.now();

  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error:  'Validation failed',
      issues: parsed.error.issues.map(i => ({
        field:   i.path.join('.') || 'body',
        message: i.message
      }))
    });
  }

  let decision;
  try {
    decision = engine.analyze(parsed.data);
  } catch (err) {
    log.error({ err }, 'Engine error during analysis');
    return res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }

  // update stats
  totalAnalyses++;
  scoreDistribution[decision.riskLevel] = (scoreDistribution[decision.riskLevel] || 0) + 1;
  for (const rule of decision.triggeredRules) {
    ruleHits[rule.ruleId] = (ruleHits[rule.ruleId] || 0) + 1;
  }
  const latency = Date.now() - t0;
  latencySamples.push(latency);
  if (latencySamples.length > 1000) latencySamples.shift();

  log.info({
    correlationId: decision.correlationId,
    riskScore:     decision.riskScore,
    riskLevel:     decision.riskLevel,
    rules:         decision.triggeredRules.map(r => r.ruleId),
    latencyMs:     latency
  }, 'analysis complete');

  res.json(decision);
});

/**
 * GET /health
 *
 * Liveness/readiness probe.
 */
app.get('/health', (_req, res) => {
  res.json({
    status:    'healthy',
    service:   'fraud-service',
    version:   '2.0.0',
    uptime:    Math.floor((Date.now() - startTime) / 1000),
    engineStats: engine.stats()
  });
});

/**
 * GET /stats
 *
 * Operational metrics for the fraud engine.
 */
app.get('/stats', (_req, res) => {
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const p50    = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p95    = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99    = sorted[Math.floor(sorted.length * 0.99)] || 0;

  res.json({
    totalAnalyses,
    uptime:           Math.floor((Date.now() - startTime) / 1000),
    ruleHits,
    scoreDistribution,
    latency:          { p50, p95, p99, samples: latencySamples.length },
    engineInternals:  engine.stats(),
    config: {
      rules: Object.fromEntries(
        Object.entries(config.fraud.rules).map(([k, v]) => [k, { enabled: v.enabled, weight: v.weight }])
      ),
      thresholds: config.fraud.thresholds
    }
  });
});

/**
 * POST /reset
 *
 * Clear all in-memory state. Intended for dev/testing only.
 */
app.post('/reset', (_req, res) => {
  engine.clearHistory();
  totalAnalyses = 0;
  Object.keys(ruleHits).forEach(k => delete ruleHits[k]);
  Object.keys(scoreDistribution).forEach(k => { scoreDistribution[k] = 0; });
  latencySamples.length = 0;
  log.info('Engine state cleared via /reset');
  res.json({ message: 'Engine state cleared' });
});

// ── 404 fallthrough ───────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── start ──────────────────────────────────────────────────────────────────────

const PORT = config.fraudService.port;

app.listen(PORT, () => {
  log.info({ port: PORT }, 'Fraud Detection Service started');
  log.info({
    rules: Object.keys(config.fraud.rules).filter(k => config.fraud.rules[k].enabled),
    thresholds: config.fraud.thresholds
  }, 'Engine configuration loaded');
});

module.exports = app;
