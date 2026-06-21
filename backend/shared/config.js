/**
 * Central configuration — all values read from environment variables with
 * safe defaults for local development. Copy .env.example → .env and
 * override any value for staging/production.
 */
'use strict';

const env = (key, fallback) => process.env[key] ?? fallback;
const envInt = (key, fallback) => parseInt(process.env[key] ?? fallback, 10);
const envFloat = (key, fallback) => parseFloat(process.env[key] ?? fallback);
const envBool = (key, fallback = 'false') => (process.env[key] ?? fallback).toLowerCase() === 'true';

module.exports = {
  env: env('NODE_ENV', 'development'),

  gateway: {
    port: envInt('GATEWAY_PORT', 4000),
    jwtSecret: env('JWT_SECRET', null),    // null → auth disabled (dev mode)
    jwtExpiresIn: env('JWT_EXPIRES_IN', '24h'),
    requireAuth: envBool('REQUIRE_AUTH', 'false')
  },

  fraudService: {
    port: envInt('FRAUD_SERVICE_PORT', 4001),
    url: env('FRAUD_SERVICE_URL', 'http://localhost:4001'),
    timeoutMs: envInt('FRAUD_SERVICE_TIMEOUT_MS', 3000)
  },

  services: {
    payment:      { url: env('PAYMENT_SERVICE_URL',      'http://localhost:3001'), port: 3001 },
    account:      { url: env('ACCOUNT_SERVICE_URL',      'http://localhost:3002'), port: 3002 },
    verification: { url: env('VERIFICATION_SERVICE_URL', 'http://localhost:3003'), port: 3003 }
  },

  data: {
    dir: env('DATA_DIR', './data'),
    maxRequestLogs: envInt('MAX_REQUEST_LOGS', 5000),
    maxFraudEvents: envInt('MAX_FRAUD_EVENTS', 2000),
    maxMetricSnapshots: envInt('MAX_METRIC_SNAPSHOTS', 1440)   // 24 h × 1 per min
  },

  rateLimit: {
    windowMs:    envInt('RATE_LIMIT_WINDOW_MS', 60_000),
    maxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 120),
    enabled:     envBool('RATE_LIMIT_ENABLED', 'true')
  },

  fraud: {
    thresholds: {
      suspiciousScore:          envInt('FRAUD_SUSPICIOUS_THRESHOLD', 31),
      highRiskScore:            envInt('FRAUD_HIGH_RISK_THRESHOLD', 70),
      rapidFireCount:           envInt('FRAUD_RAPID_FIRE_COUNT', 20),
      rapidFireWindowMs:        envInt('FRAUD_RAPID_FIRE_WINDOW_MS', 60_000),
      payloadZScoreHigh:        envFloat('FRAUD_ZSCORE_HIGH', 3.0),
      payloadZScoreMedium:      envFloat('FRAUD_ZSCORE_MEDIUM', 2.0),
      sequentialWindowMs:       envInt('FRAUD_PATTERN_WINDOW_MS', 300_000),
      sequentialCountHigh:      envInt('FRAUD_PATTERN_COUNT_HIGH', 5),
      sequentialCountMedium:    envInt('FRAUD_PATTERN_COUNT_MEDIUM', 3),
      credentialStuffingCount:  envInt('FRAUD_CREDENTIAL_STUFFING_COUNT', 5),
      credentialStuffingWindowMs: envInt('FRAUD_CREDENTIAL_STUFFING_WINDOW_MS', 120_000),
      burstTransferCount:       envInt('FRAUD_BURST_TRANSFER_COUNT', 3),
      burstTransferWindowMs:    envInt('FRAUD_BURST_TRANSFER_WINDOW_MS', 60_000),
      velocitySpikeMultiplier:  envFloat('FRAUD_VELOCITY_SPIKE_MULTIPLIER', 3.0)
    },
    rules: {
      RAPID_FIRE:          { enabled: envBool('RULE_RAPID_FIRE_ENABLED', 'true'),          weight: envInt('RULE_RAPID_FIRE_WEIGHT', 40)          },
      PAYLOAD_ANOMALY:     { enabled: envBool('RULE_PAYLOAD_ANOMALY_ENABLED', 'true'),     weight: envInt('RULE_PAYLOAD_ANOMALY_WEIGHT', 35)     },
      TIME_BASED:          { enabled: envBool('RULE_TIME_BASED_ENABLED', 'true'),          weight: envInt('RULE_TIME_BASED_WEIGHT', 15)          },
      SEQUENTIAL_PATTERN:  { enabled: envBool('RULE_SEQUENTIAL_PATTERN_ENABLED', 'true'),  weight: envInt('RULE_SEQUENTIAL_PATTERN_WEIGHT', 25) },
      CREDENTIAL_STUFFING: { enabled: envBool('RULE_CREDENTIAL_STUFFING_ENABLED', 'true'), weight: envInt('RULE_CREDENTIAL_STUFFING_WEIGHT', 30) },
      BURST_TRANSFER:      { enabled: envBool('RULE_BURST_TRANSFER_ENABLED', 'true'),      weight: envInt('RULE_BURST_TRANSFER_WEIGHT', 35)      },
      VELOCITY_SPIKE:      { enabled: envBool('RULE_VELOCITY_SPIKE_ENABLED', 'true'),      weight: envInt('RULE_VELOCITY_SPIKE_WEIGHT', 20)      }
    }
  },

  log: {
    level: env('LOG_LEVEL', 'info'),
    pretty: envBool('LOG_PRETTY', 'true')
  }
};
