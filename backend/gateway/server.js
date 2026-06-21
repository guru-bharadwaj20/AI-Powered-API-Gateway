'use strict';

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');
const jwt        = require('jsonwebtoken');
const swaggerUi  = require('swagger-ui-express');

const config     = require('../shared/config');
const createLogger = require('../shared/logger');
const rateLimiter  = require('../shared/rateLimiter');
const db           = require('../shared/db');
const {
  validate,
  CreatePaymentSchema,
  CreateAccountSchema,
  UpdateAccountSchema,
  VerifyIdentitySchema,
  VerifyTransactionSchema,
  AuthTokenSchema
} = require('../shared/validators');

const log = createLogger('gateway');
const app = express();
const PORT = config.gateway.port;

// ── middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, '../../frontend/build')));

// Correlation ID + request timer
app.use((req, res, next) => {
  req.correlationId = uuidv4();
  req.startTime     = Date.now();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
});

// Structured request logging
app.use((req, res, next) => {
  res.on('finish', () => {
    log.info({
      correlationId: req.correlationId,
      method: req.method,
      path:   req.path,
      status: res.statusCode,
      ms:     Date.now() - req.startTime
    }, 'request');
  });
  next();
});

// Rate limiting (applies to /api/* only)
app.use('/api', (req, res, next) => {
  const key = getClientIp(req);
  const { limited, remaining, resetAt } = rateLimiter.check(key);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', new Date(resetAt).toISOString());
  if (limited) {
    log.warn({ ip: key, correlationId: req.correlationId }, 'rate limit exceeded');
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: Math.ceil((resetAt - Date.now()) / 1000)
    });
  }
  next();
});

// Optional JWT authentication
function authMiddleware(req, res, next) {
  if (!config.gateway.requireAuth) return next();
  const secret = config.gateway.jwtSecret;
  if (!secret) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required', message: 'Provide a Bearer token.' });
  }

  try {
    const token = authHeader.slice(7);
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── OpenAPI / Swagger ─────────────────────────────────────────────────────────

const swaggerDoc = require('./swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// ── helpers ───────────────────────────────────────────────────────────────────

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || '127.0.0.1';
}

function forwardRequest(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const bodyString = (method !== 'GET' && body) ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port:     url.port || 80,
      path:     url.pathname + (url.search || ''),
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyString ? { 'Content-Length': Buffer.byteLength(bodyString) } : {}),
        ...headers
      },
      timeout: 8000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try   { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: { message: data } }); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (bodyString) req.write(bodyString);
    req.end();
  });
}

async function callFraudService(requestData) {
  const { url, timeoutMs } = config.fraudService;
  const bodyStr = JSON.stringify(requestData);

  return new Promise((resolve) => {
    const u = new URL(`${url}/analyze`);
    const options = {
      hostname: u.hostname,
      port:     u.port || 80,
      path:     '/analyze',
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      },
      timeout: timeoutMs
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try   { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.write(bodyStr);
    req.end();
  });
}

function fallbackDecision(correlationId) {
  return {
    correlationId,
    riskScore:      0,
    riskLevel:      'NORMAL',
    confidence:     1.0,
    recommendation: 'ALLOW_NORMAL',
    triggeredRules: [],
    reasons:        [],
    explanation:    'Fraud service unavailable — applying permissive fallback.',
    metadata:       {}
  };
}

const metrics = {
  startTime:            Date.now(),
  totalRequests:        0,
  successRequests:      0,
  failedRequests:       0,
  blockedRequests:      0,
  totalRiskScore:       0,
  totalResponseTime:    0,
  requestsByRiskLevel:  { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 },
  requestsByEndpoint:   {},
  requestsByMethod:     { GET: 0, POST: 0, PUT: 0, DELETE: 0 },
  triggeredRules:       {}
};

const latencySamples = [];

function recordRequest(riskDecision, statusCode, responseTime) {
  metrics.totalRequests++;
  if (statusCode >= 200 && statusCode < 300) metrics.successRequests++;
  else metrics.failedRequests++;
  if (riskDecision.recommendation === 'BLOCK_AND_VERIFY') metrics.blockedRequests++;

  metrics.requestsByRiskLevel[riskDecision.riskLevel] =
    (metrics.requestsByRiskLevel[riskDecision.riskLevel] || 0) + 1;

  for (const rule of riskDecision.triggeredRules || []) {
    metrics.triggeredRules[rule.ruleId] = (metrics.triggeredRules[rule.ruleId] || 0) + 1;
  }

  metrics.totalRiskScore   += riskDecision.riskScore;
  metrics.totalResponseTime += responseTime;

  latencySamples.push(responseTime);
  if (latencySamples.length > 2000) latencySamples.shift();
}

function buildLogEntry(req, requestData, riskDecision, targetService, routingDecision, statusCode, responseTime, responseBody) {
  return {
    correlationId: req.correlationId,
    timestamp:     new Date().toISOString(),
    request:       { method: requestData.method, endpoint: requestData.endpoint, body: requestData.body, ipAddress: requestData.ipAddress },
    riskDecision,
    routing:       { targetService, routingDecision, reason: routingDecision === 'BLOCKED' ? 'Risk score exceeds threshold' : 'Normal traffic' },
    response:      { statusCode, responseTime, body: responseBody }
  };
}

// ── core request handler factory ──────────────────────────────────────────────

function makeHandler({ endpoint, baseEndpoint, method, targetUrl, serviceName }) {
  return async (req, res) => {
    const ep = baseEndpoint || endpoint;
    metrics.requestsByEndpoint[ep] = (metrics.requestsByEndpoint[ep] || 0) + 1;
    metrics.requestsByMethod[method] = (metrics.requestsByMethod[method] || 0) + 1;

    const requestData = {
      correlationId: req.correlationId,
      ipAddress:     getClientIp(req),
      endpoint:      ep,
      method,
      body:          method !== 'GET' ? req.body : {}
    };

    const riskDecision = (await callFraudService(requestData)) || fallbackDecision(req.correlationId);

    res.setHeader('X-Risk-Score', riskDecision.riskScore);
    res.setHeader('X-Risk-Level', riskDecision.riskLevel);
    res.setHeader('X-Risk-Confidence', riskDecision.confidence);

    if (riskDecision.recommendation === 'BLOCK_AND_VERIFY' || riskDecision.recommendation === 'REQUIRE_ADDITIONAL_AUTH') {
      const rt = Date.now() - req.startTime;
      recordRequest(riskDecision, 403, rt);
      db.requests.insert(buildLogEntry(req, requestData, riskDecision, serviceName, 'BLOCKED', 403, rt, null));
      if (riskDecision.riskLevel === 'HIGH_RISK') {
        db.fraudEvents.insert({ ...riskDecision, endpoint: ep, ipAddress: requestData.ipAddress });
      }
      return res.status(403).json({
        error:         'Request blocked',
        riskScore:     riskDecision.riskScore,
        riskLevel:     riskDecision.riskLevel,
        confidence:    riskDecision.confidence,
        explanation:   riskDecision.explanation,
        reasons:       riskDecision.reasons,
        correlationId: req.correlationId
      });
    }

    const resolvedUrl = typeof targetUrl === 'function' ? targetUrl(req) : targetUrl;

    try {
      const result = await forwardRequest(resolvedUrl, method, {
        'X-Correlation-ID': req.correlationId,
        'X-Risk-Score':     riskDecision.riskScore,
        'X-Risk-Level':     riskDecision.riskLevel
      }, method !== 'GET' ? req.body : null);

      const rt = Date.now() - req.startTime;
      recordRequest(riskDecision, result.status, rt);
      db.requests.insert(buildLogEntry(req, requestData, riskDecision, serviceName, 'ALLOWED', result.status, rt, result.data));

      res.status(result.status).json({
        ...result.data,
        riskScore:  riskDecision.riskScore,
        riskLevel:  riskDecision.riskLevel
      });
    } catch (err) {
      const rt = Date.now() - req.startTime;
      recordRequest(riskDecision, 503, rt);
      log.error({ err: err.message, service: serviceName, correlationId: req.correlationId }, 'upstream error');
      res.status(503).json({ error: `${serviceName} unavailable`, correlationId: req.correlationId });
    }
  };
}

// ── AUTH endpoint ─────────────────────────────────────────────────────────────

app.post('/api/auth/token', validate(AuthTokenSchema), (req, res) => {
  const secret = config.gateway.jwtSecret;
  if (!secret) {
    return res.status(503).json({ error: 'JWT authentication is not configured on this server.' });
  }

  const { username } = req.body;
  const role = username === 'admin' ? 'admin' : 'analyst';

  const token = jwt.sign(
    { sub: username, role, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: config.gateway.jwtExpiresIn }
  );

  res.json({
    token,
    expiresIn: config.gateway.jwtExpiresIn,
    role,
    note: 'Include as: Authorization: Bearer <token>'
  });
});

// ── Payment Routes ────────────────────────────────────────────────────────────

app.post('/api/payments', authMiddleware, validate(CreatePaymentSchema),
  makeHandler({
    endpoint:    '/api/payments',
    method:      'POST',
    targetUrl:   `${config.services.payment.url}/api/payments`,
    serviceName: 'payment-service'
  })
);

app.get('/api/payments/:transactionId', authMiddleware,
  makeHandler({
    baseEndpoint: '/api/payments/:transactionId',
    method:       'GET',
    targetUrl:    req => `${config.services.payment.url}/api/payments/${req.params.transactionId}`,
    serviceName:  'payment-service'
  })
);

// ── Account Routes ────────────────────────────────────────────────────────────

app.post('/api/accounts', authMiddleware, validate(CreateAccountSchema),
  makeHandler({
    endpoint:    '/api/accounts',
    method:      'POST',
    targetUrl:   `${config.services.account.url}/api/accounts`,
    serviceName: 'account-service'
  })
);

app.get('/api/accounts/:accountId', authMiddleware,
  makeHandler({
    baseEndpoint: '/api/accounts/:accountId',
    method:       'GET',
    targetUrl:    req => `${config.services.account.url}/api/accounts/${req.params.accountId}`,
    serviceName:  'account-service'
  })
);

app.put('/api/accounts/:accountId', authMiddleware, validate(UpdateAccountSchema),
  makeHandler({
    baseEndpoint: '/api/accounts/:accountId',
    method:       'PUT',
    targetUrl:    req => `${config.services.account.url}/api/accounts/${req.params.accountId}`,
    serviceName:  'account-service'
  })
);

// ── Verification Routes ───────────────────────────────────────────────────────

app.post('/api/verify/identity', authMiddleware, validate(VerifyIdentitySchema),
  makeHandler({
    endpoint:    '/api/verify/identity',
    method:      'POST',
    targetUrl:   `${config.services.verification.url}/api/verify/identity`,
    serviceName: 'verification-service'
  })
);

app.post('/api/verify/transaction', authMiddleware, validate(VerifyTransactionSchema),
  makeHandler({
    endpoint:    '/api/verify/transaction',
    method:      'POST',
    targetUrl:   `${config.services.verification.url}/api/verify/transaction`,
    serviceName: 'verification-service'
  })
);

// ── Observability Endpoints ───────────────────────────────────────────────────

app.get('/metrics', (req, res) => {
  const total = metrics.totalRequests || 1;
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

  res.json({
    timestamp: new Date().toISOString(),
    uptime:    Math.floor((Date.now() - metrics.startTime) / 1000),
    requests: {
      total:      metrics.totalRequests,
      success:    metrics.successRequests,
      failed:     metrics.failedRequests,
      blocked:    metrics.blockedRequests,
      byMethod:   metrics.requestsByMethod,
      byEndpoint: metrics.requestsByEndpoint
    },
    risk: {
      averageScore: metrics.totalRequests > 0
        ? Math.round((metrics.totalRiskScore / total) * 10) / 10
        : 0,
      byLevel:      metrics.requestsByRiskLevel,
      histogram:    db.requests.riskHistogram()
    },
    fraud:       { triggeredRules: metrics.triggeredRules },
    performance: {
      averageResponseTime: metrics.totalRequests > 0
        ? Math.round(metrics.totalResponseTime / total)
        : 0,
      latency: { p50, p95, p99 }
    }
  });
});

app.get('/metrics/prometheus', (req, res) => {
  const uptime  = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgMs   = metrics.totalRequests > 0
    ? Math.round(metrics.totalResponseTime / metrics.totalRequests)
    : 0;
  const sorted  = [...latencySamples].sort((a, b) => a - b);
  const p95     = sorted[Math.floor(sorted.length * 0.95)] || 0;

  const lines = [
    `# HELP gateway_requests_total Total requests processed`,
    `# TYPE gateway_requests_total counter`,
    `gateway_requests_total ${metrics.totalRequests}`,
    `gateway_requests_blocked_total ${metrics.blockedRequests}`,
    `# HELP gateway_uptime_seconds`,
    `# TYPE gateway_uptime_seconds gauge`,
    `gateway_uptime_seconds ${uptime}`,
    `# HELP gateway_response_time_ms`,
    `# TYPE gateway_response_time_ms gauge`,
    `gateway_response_time_avg_ms ${avgMs}`,
    `gateway_response_time_p95_ms ${p95}`,
    `# HELP gateway_risk_level_total Requests by risk classification`,
    `# TYPE gateway_risk_level_total counter`,
    `gateway_risk_level_total{level="NORMAL"} ${metrics.requestsByRiskLevel.NORMAL}`,
    `gateway_risk_level_total{level="SUSPICIOUS"} ${metrics.requestsByRiskLevel.SUSPICIOUS}`,
    `gateway_risk_level_total{level="HIGH_RISK"} ${metrics.requestsByRiskLevel.HIGH_RISK}`
  ];

  for (const [rule, count] of Object.entries(metrics.triggeredRules)) {
    lines.push(`gateway_fraud_rule_triggers_total{rule="${rule}"} ${count}`);
  }

  res.set('Content-Type', 'text/plain; version=0.0.4').send(lines.join('\n') + '\n');
});

app.get('/logs', (req, res) => {
  const limit     = Math.min(parseInt(req.query.limit) || 50, 500);
  const riskLevel = req.query.riskLevel;
  const endpoint  = req.query.endpoint;

  const where = riskLevel || endpoint
    ? r => (!riskLevel || r.riskDecision?.riskLevel === riskLevel)
        && (!endpoint  || r.request?.endpoint === endpoint)
    : null;

  const logs = db.requests.find({ limit, where });
  const total = db.requests.count(where);

  res.json({ logs, totalCount: total });
});

app.get('/logs/timeline', (req, res) => {
  const minutes = Math.min(parseInt(req.query.minutes) || 15, 60);
  res.json(db.requests.timeline(minutes));
});

app.get('/logs/endpoint-heatmap', (req, res) => {
  res.json(db.requests.endpointCounts());
});

app.get('/logs/fraud-events', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const events = db.fraudEvents.find({ limit });
  res.json({ events, totalCount: db.fraudEvents.count() });
});

app.post('/api/clear-logs', (req, res) => {
  db.requests.clear();
  log.info({ correlationId: req.correlationId }, 'Logs cleared');
  res.json({ success: true, message: 'Logs cleared' });
});

app.post('/api/reset-metrics', async (req, res) => {
  Object.assign(metrics, {
    totalRequests: 0, successRequests: 0, failedRequests: 0, blockedRequests: 0,
    totalRiskScore: 0, totalResponseTime: 0,
    requestsByRiskLevel: { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 },
    requestsByEndpoint:  {},
    requestsByMethod:    { GET: 0, POST: 0, PUT: 0, DELETE: 0 },
    triggeredRules:      {},
    startTime:           Date.now()
  });
  latencySamples.length = 0;
  db.reset();

  // also reset fraud service state
  try {
    await forwardRequest(`${config.fraudService.url}/reset`, 'POST', {}, {});
  } catch { /* ignore if fraud service is down */ }

  log.info({ correlationId: req.correlationId }, 'Metrics reset');
  res.json({ success: true, message: 'All metrics and logs cleared' });
});

app.get('/api/fraud-patterns', (req, res) => {
  const patterns = Object.entries(metrics.triggeredRules)
    .filter(([, c]) => c > 0)
    .map(([ruleId, count]) => ({
      ruleId,
      count,
      severity: count > 20 ? 'high' : count > 5 ? 'medium' : 'low',
      lastDetected: new Date().toISOString()
    }));

  res.json({ patterns, total: patterns.length, timestamp: new Date().toISOString() });
});

app.get('/health', (_req, res) => {
  res.json({
    status:    'healthy',
    service:   'api-gateway',
    version:   '2.0.0',
    port:      PORT,
    uptime:    Math.floor((Date.now() - metrics.startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

// ── SPA fallback ──────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../../frontend/build/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(404).json({ error: 'Not found' });
  });
});

// ── start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info({ port: PORT }, 'API Gateway started');
  log.info({ authEnabled: config.gateway.requireAuth }, 'Configuration');
});

module.exports = app;
