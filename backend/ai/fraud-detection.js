const crypto = require('crypto');

class FraudDetectionEngine {
  constructor() {
    this.requestHistory = new Map();
    this.payloadHashes = new Map();
    this.transactionHistory = [];
    this.ipRequestCounts = new Map();
    this.ruleWeights = {
      RAPID_FIRE: 40,
      PAYLOAD_ANOMALY: 30,
      TIME_BASED: 15,
      SEQUENTIAL_PATTERN: 25,
      GEO_VELOCITY: 20
    };
  }

  analyzeRequest(requestData) {
    const features = this.extractFeatures(requestData);
    const triggeredRules = [];
    let totalScore = 0;

    const rapidFireResult = this.detectRapidFire(features);
    if (rapidFireResult.triggered) {
      triggeredRules.push(rapidFireResult);
      totalScore += rapidFireResult.score;
    }

    const payloadResult = this.detectPayloadAnomaly(features);
    if (payloadResult.triggered) {
      triggeredRules.push(payloadResult);
      totalScore += payloadResult.score;
    }

    const timeResult = this.detectTimeAnomaly(features);
    if (timeResult.triggered) {
      triggeredRules.push(timeResult);
      totalScore += timeResult.score;
    }

    const sequentialResult = this.detectSequentialPattern(features);
    if (sequentialResult.triggered) {
      triggeredRules.push(sequentialResult);
      totalScore += sequentialResult.score;
    }

    const finalScore = Math.min(100, totalScore);
    const riskLevel = this.calculateRiskLevel(finalScore);
    const recommendation = this.generateRecommendation(finalScore, features);

    this.updateHistory(features);

    return {
      correlationId: features.correlationId,
      timestamp: features.timestamp,
      riskScore: finalScore,
      riskLevel: riskLevel,
      triggeredRules: triggeredRules,
      recommendation: recommendation,
      explanation: this.generateExplanation(triggeredRules, finalScore),
      metadata: {
        ipAddress: features.ipAddress,
        endpoint: features.endpoint,
        method: features.method
      }
    };
  }

  extractFeatures(requestData) {
    const now = Date.now();
    const hour = new Date(now).getHours();
    
    return {
      correlationId: requestData.correlationId,
      timestamp: new Date(now).toISOString(),
      ipAddress: requestData.ipAddress || '127.0.0.1',
      userAgent: requestData.userAgent || 'Unknown',
      endpoint: requestData.endpoint,
      method: requestData.method,
      body: requestData.body || {},
      hourOfDay: hour,
      isBusinessHours: hour >= 9 && hour <= 21,
      amount: requestData.body?.amount || 0,
      userId: requestData.body?.userId || 'anonymous'
    };
  }

  detectRapidFire(features) {
    const ip = features.ipAddress;
    const now = Date.now();
    const windowMs = 60000;

    if (!this.ipRequestCounts.has(ip)) {
      this.ipRequestCounts.set(ip, []);
    }

    const requests = this.ipRequestCounts.get(ip);
    requests.push(now);

    const recentRequests = requests.filter(time => now - time < windowMs);
    this.ipRequestCounts.set(ip, recentRequests);

    const requestCount = recentRequests.length;

    if (requestCount > 20) {
      const severity = requestCount > 30 ? 'CRITICAL' : 'HIGH';
      const score = Math.min(95, this.ruleWeights.RAPID_FIRE + (requestCount - 20) * 2);
      
      return {
        triggered: true,
        ruleId: 'RAPID_FIRE',
        ruleName: 'Rapid Request Detection',
        severity: severity,
        confidence: 0.95,
        score: score,
        reasoning: `Detected ${requestCount} requests in 60 seconds from IP ${ip}`
      };
    } else if (requestCount > 10) {
      return {
        triggered: true,
        ruleId: 'RAPID_FIRE',
        ruleName: 'Rapid Request Detection',
        severity: 'MEDIUM',
        confidence: 0.75,
        score: this.ruleWeights.RAPID_FIRE * 0.6,
        reasoning: `Detected ${requestCount} requests in 60 seconds from IP ${ip} (elevated activity)`
      };
    }

    return { triggered: false };
  }

  detectPayloadAnomaly(features) {
    if (!features.amount || features.amount === 0) {
      return { triggered: false };
    }

    this.transactionHistory.push(features.amount);
    if (this.transactionHistory.length > 100) {
      this.transactionHistory.shift();
    }

    if (this.transactionHistory.length < 10) {
      return { triggered: false };
    }

    const mean = this.transactionHistory.reduce((a, b) => a + b, 0) / this.transactionHistory.length;
    const variance = this.transactionHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.transactionHistory.length;
    const stdDev = Math.sqrt(variance);

    const zScore = (features.amount - mean) / stdDev;

    if (Math.abs(zScore) > 3) {
      return {
        triggered: true,
        ruleId: 'PAYLOAD_ANOMALY',
        ruleName: 'Statistical Outlier Detection',
        severity: 'HIGH',
        confidence: 0.88,
        score: this.ruleWeights.PAYLOAD_ANOMALY + 15,
        reasoning: `Transaction amount $${features.amount} is ${zScore.toFixed(1)}σ from average $${mean.toFixed(0)}`
      };
    } else if (Math.abs(zScore) > 2) {
      return {
        triggered: true,
        ruleId: 'PAYLOAD_ANOMALY',
        ruleName: 'Statistical Outlier Detection',
        severity: 'MEDIUM',
        confidence: 0.75,
        score: this.ruleWeights.PAYLOAD_ANOMALY,
        reasoning: `Transaction amount $${features.amount} is ${zScore.toFixed(1)}σ from average $${mean.toFixed(0)}`
      };
    }

    return { triggered: false };
  }

  detectTimeAnomaly(features) {
    if (!features.isBusinessHours && features.amount > 1000) {
      const severity = features.amount > 5000 ? 'HIGH' : 'MEDIUM';
      const score = severity === 'HIGH' ? this.ruleWeights.TIME_BASED + 10 : this.ruleWeights.TIME_BASED;
      
      return {
        triggered: true,
        ruleId: 'TIME_BASED',
        ruleName: 'Temporal Anomaly Detection',
        severity: severity,
        confidence: 0.85,
        score: score,
        reasoning: `High-value transaction ($${features.amount}) at ${features.hourOfDay}:00 (off-hours)`
      };
    }

    return { triggered: false };
  }

  detectSequentialPattern(features) {
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify(features.body))
      .digest('hex');

    const now = Date.now();
    const windowMs = 300000;

    if (!this.payloadHashes.has(payloadHash)) {
      this.payloadHashes.set(payloadHash, []);
    }

    const occurrences = this.payloadHashes.get(payloadHash);
    occurrences.push(now);

    const recentOccurrences = occurrences.filter(time => now - time < windowMs);
    this.payloadHashes.set(payloadHash, recentOccurrences);

    if (recentOccurrences.length >= 5) {
      return {
        triggered: true,
        ruleId: 'SEQUENTIAL_PATTERN',
        ruleName: 'Replay Attack Detection',
        severity: 'HIGH',
        confidence: 0.92,
        score: this.ruleWeights.SEQUENTIAL_PATTERN + 15,
        reasoning: `Identical request payload repeated ${recentOccurrences.length} times in 5 minutes`
      };
    } else if (recentOccurrences.length >= 3) {
      return {
        triggered: true,
        ruleId: 'SEQUENTIAL_PATTERN',
        ruleName: 'Replay Attack Detection',
        severity: 'MEDIUM',
        confidence: 0.80,
        score: this.ruleWeights.SEQUENTIAL_PATTERN,
        reasoning: `Identical request payload repeated ${recentOccurrences.length} times in 5 minutes`
      };
    }

    return { triggered: false };
  }

  calculateRiskLevel(score) {
    if (score >= 70) return 'HIGH_RISK';
    if (score >= 31) return 'SUSPICIOUS';
    return 'NORMAL';
  }

  generateRecommendation(score, features) {
    if (score >= 70) {
      if (features.endpoint.includes('payment')) {
        return 'BLOCK_AND_VERIFY';
      }
      return 'REQUIRE_ADDITIONAL_AUTH';
    } else if (score >= 40) {
      return 'ALLOW_WITH_MONITORING';
    }
    return 'ALLOW_NORMAL';
  }

  generateExplanation(triggeredRules, score) {
    if (triggeredRules.length === 0) {
      return 'No anomalies detected. Request appears legitimate.';
    }

    const highSeverityRules = triggeredRules.filter(r => r.severity === 'HIGH' || r.severity === 'CRITICAL');
    
    if (highSeverityRules.length > 0) {
      return `Multiple high-severity fraud indicators detected. Primary concern: ${highSeverityRules[0].reasoning}`;
    }

    return `Suspicious activity detected. ${triggeredRules[0].reasoning}`;
  }

  updateHistory(features) {
    const key = `${features.ipAddress}-${features.userId}`;
    if (!this.requestHistory.has(key)) {
      this.requestHistory.set(key, []);
    }
    
    const history = this.requestHistory.get(key);
    history.push({
      timestamp: Date.now(),
      endpoint: features.endpoint,
      amount: features.amount
    });

    if (history.length > 50) {
      history.shift();
    }
  }

  getStatistics() {
    return {
      totalIpsTracked: this.ipRequestCounts.size,
      totalTransactionsAnalyzed: this.transactionHistory.length,
      activePatterns: this.payloadHashes.size
    };
  }

  clearHistory() {
    this.requestHistory.clear();
    this.payloadHashes.clear();
    this.ipRequestCounts.clear();
    this.transactionHistory = [];
  }
}

module.exports = FraudDetectionEngine;

// Made with Bob
