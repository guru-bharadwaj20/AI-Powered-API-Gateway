const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const http = require('http');
const FraudDetectionEngine = require('../ai/fraud-detection');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

const frontendBuildPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuildPath));

const fraudEngine = new FraudDetectionEngine();

const metrics = {
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  blockedRequests: 0,
  requestsByRiskLevel: {
    NORMAL: 0,
    SUSPICIOUS: 0,
    HIGH_RISK: 0
  },
  requestsByEndpoint: {},
  requestsByMethod: {
    GET: 0,
    POST: 0,
    PUT: 0,
    DELETE: 0
  },
  averageRiskScore: 0,
  totalRiskScore: 0,
  averageResponseTime: 0,
  totalResponseTime: 0,
  triggeredRules: {
    RAPID_FIRE: 0,
    PAYLOAD_ANOMALY: 0,
    TIME_BASED: 0,
    SEQUENTIAL_PATTERN: 0,
    GEO_VELOCITY: 0
  },
  startTime: Date.now()
};

const requestLogs = [];
const MAX_LOGS = 1000;

function logRequest(logEntry) {
  requestLogs.unshift(logEntry);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.pop();
  }
}

function updateMetrics(aiDecision, statusCode, responseTime) {
  metrics.totalRequests++;

  if (statusCode >= 200 && statusCode < 300) {
    metrics.successRequests++;
  } else {
    metrics.failedRequests++;
  }

  if (aiDecision.recommendation === 'BLOCK_AND_VERIFY') {
    metrics.blockedRequests++;
  }

  metrics.requestsByRiskLevel[aiDecision.riskLevel]++;

  aiDecision.triggeredRules.forEach(rule => {
    if (metrics.triggeredRules[rule.ruleId] !== undefined) {
      metrics.triggeredRules[rule.ruleId]++;
    }
  });

  metrics.totalRiskScore += aiDecision.riskScore;
  metrics.averageRiskScore = metrics.totalRiskScore / metrics.totalRequests;

  metrics.totalResponseTime += responseTime;
  metrics.averageResponseTime = Math.round(metrics.totalResponseTime / metrics.totalRequests);
}

function forwardRequest(targetUrl, method, headers, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);

    const bodyString = method !== 'GET' && body ? JSON.stringify(body) : null;

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(bodyString ? { 'Content-Length': Buffer.byteLength(bodyString) } : {}),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: { message: data } });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (bodyString) {
      req.write(bodyString);
    }

    req.end();
  });
}

// Correlation ID middleware
app.use((req, res, next) => {
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

function getClientIp(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
}

// ─── Payment Routes ──────────────────────────────────────────────────────────

app.post('/api/payments', async (req, res) => {
  const endpoint = '/api/payments';

  if (!metrics.requestsByEndpoint[endpoint]) metrics.requestsByEndpoint[endpoint] = 0;
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint,
    method: 'POST',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);

  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  const responseTime = Date.now() - req.startTime;

  if (aiDecision.recommendation === 'BLOCK_AND_VERIFY') {
    updateMetrics(aiDecision, 403, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'POST', endpoint, body: req.body, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'payment-service', routingDecision: 'BLOCKED', reason: 'Risk score exceeds threshold' },
      response: { statusCode: 403, responseTime }
    });
    return res.status(403).json({
      error: 'Transaction blocked due to high fraud risk',
      riskScore: aiDecision.riskScore,
      riskLevel: aiDecision.riskLevel,
      explanation: aiDecision.explanation,
      correlationId: req.correlationId
    });
  }

  try {
    const result = await forwardRequest(`http://localhost:3001${endpoint}`, 'POST', {
      'X-Correlation-ID': req.correlationId,
      'X-Risk-Score': aiDecision.riskScore,
      'X-Risk-Level': aiDecision.riskLevel
    }, req.body);

    const finalResponseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, finalResponseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'POST', endpoint, body: req.body, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: {
        targetService: 'payment-service',
        routingDecision: 'ALLOWED',
        reason: aiDecision.riskLevel === 'SUSPICIOUS' ? 'Allowed with monitoring' : 'Normal traffic'
      },
      response: { statusCode: result.status, responseTime: finalResponseTime, body: result.data }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore, riskLevel: aiDecision.riskLevel });
  } catch (error) {
    const errorResponseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, 503, errorResponseTime);
    res.status(503).json({ error: 'Payment service unavailable', correlationId: req.correlationId });
  }
});

app.get('/api/payments/:transactionId', async (req, res) => {
  const endpoint = `/api/payments/${req.params.transactionId}`;
  const baseEndpoint = '/api/payments/:transactionId';

  if (!metrics.requestsByEndpoint[baseEndpoint]) metrics.requestsByEndpoint[baseEndpoint] = 0;
  metrics.requestsByEndpoint[baseEndpoint]++;
  metrics.requestsByMethod.GET++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint: baseEndpoint,
    method: 'GET',
    body: {}
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const result = await forwardRequest(`http://localhost:3001${endpoint}`, 'GET', {
      'X-Correlation-ID': req.correlationId
    });

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'GET', endpoint: baseEndpoint, params: req.params, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'payment-service', routingDecision: 'ALLOWED' },
      response: { statusCode: result.status, responseTime }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Payment service unavailable', correlationId: req.correlationId });
  }
});

// ─── Account Routes ───────────────────────────────────────────────────────────

app.post('/api/accounts', async (req, res) => {
  const endpoint = '/api/accounts';

  if (!metrics.requestsByEndpoint[endpoint]) metrics.requestsByEndpoint[endpoint] = 0;
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint,
    method: 'POST',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const result = await forwardRequest(`http://localhost:3002${endpoint}`, 'POST', {
      'X-Correlation-ID': req.correlationId,
      'X-Risk-Score': aiDecision.riskScore
    }, req.body);

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'POST', endpoint, body: req.body, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'account-service', routingDecision: 'ALLOWED' },
      response: { statusCode: result.status, responseTime }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Account service unavailable', correlationId: req.correlationId });
  }
});

app.get('/api/accounts/:accountId', async (req, res) => {
  const endpoint = `/api/accounts/${req.params.accountId}`;
  const baseEndpoint = '/api/accounts/:accountId';

  if (!metrics.requestsByEndpoint[baseEndpoint]) metrics.requestsByEndpoint[baseEndpoint] = 0;
  metrics.requestsByEndpoint[baseEndpoint]++;
  metrics.requestsByMethod.GET++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint: baseEndpoint,
    method: 'GET',
    body: {}
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const result = await forwardRequest(`http://localhost:3002${endpoint}`, 'GET', {
      'X-Correlation-ID': req.correlationId
    });

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'GET', endpoint: baseEndpoint, params: req.params, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'account-service', routingDecision: 'ALLOWED' },
      response: { statusCode: result.status, responseTime }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Account service unavailable', correlationId: req.correlationId });
  }
});

app.put('/api/accounts/:accountId', async (req, res) => {
  const endpoint = `/api/accounts/${req.params.accountId}`;
  const baseEndpoint = '/api/accounts/:accountId';

  if (!metrics.requestsByEndpoint[baseEndpoint]) metrics.requestsByEndpoint[baseEndpoint] = 0;
  metrics.requestsByEndpoint[baseEndpoint]++;
  metrics.requestsByMethod.PUT++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint: baseEndpoint,
    method: 'PUT',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const result = await forwardRequest(`http://localhost:3002${endpoint}`, 'PUT', {
      'X-Correlation-ID': req.correlationId,
      'X-Risk-Score': aiDecision.riskScore
    }, req.body);

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'PUT', endpoint: baseEndpoint, body: req.body, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'account-service', routingDecision: 'ALLOWED' },
      response: { statusCode: result.status, responseTime }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Account service unavailable', correlationId: req.correlationId });
  }
});

// ─── Verification Routes ──────────────────────────────────────────────────────

app.post('/api/verify/identity', async (req, res) => {
  const endpoint = '/api/verify/identity';

  if (!metrics.requestsByEndpoint[endpoint]) metrics.requestsByEndpoint[endpoint] = 0;
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint,
    method: 'POST',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const result = await forwardRequest(`http://localhost:3003${endpoint}`, 'POST', {
      'X-Correlation-ID': req.correlationId
    }, req.body);

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: { method: 'POST', endpoint, body: req.body, ipAddress: requestData.ipAddress },
      aiDecision,
      routing: { targetService: 'verification-service', routingDecision: 'ALLOWED' },
      response: { statusCode: result.status, responseTime }
    });

    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Verification service unavailable', correlationId: req.correlationId });
  }
});

app.post('/api/verify/transaction', async (req, res) => {
  const endpoint = '/api/verify/transaction';

  if (!metrics.requestsByEndpoint[endpoint]) metrics.requestsByEndpoint[endpoint] = 0;
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    endpoint,
    method: 'POST',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);

  try {
    const result = await forwardRequest(`http://localhost:3003${endpoint}`, 'POST', {
      'X-Correlation-ID': req.correlationId
    }, req.body);

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);
    res.status(result.status).json({ ...result.data, riskScore: aiDecision.riskScore });
  } catch (error) {
    res.status(503).json({ error: 'Verification service unavailable', correlationId: req.correlationId });
  }
});

// ─── System Endpoints ─────────────────────────────────────────────────────────

app.get('/metrics', (req, res) => {
  const uptime = Math.floor((Date.now() - metrics.startTime) / 1000);
  res.json({
    timestamp: new Date().toISOString(),
    uptime,
    requests: {
      total: metrics.totalRequests,
      success: metrics.successRequests,
      failed: metrics.failedRequests,
      blocked: metrics.blockedRequests,
      byMethod: metrics.requestsByMethod,
      byEndpoint: metrics.requestsByEndpoint
    },
    risk: {
      averageScore: Math.round(metrics.averageRiskScore * 10) / 10,
      byLevel: metrics.requestsByRiskLevel
    },
    ai: { triggeredRules: metrics.triggeredRules },
    performance: { averageResponseTime: metrics.averageResponseTime }
  });
});

app.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const riskLevel = req.query.riskLevel;

  let filteredLogs = requestLogs;
  if (riskLevel) {
    filteredLogs = requestLogs.filter(log => log.aiDecision.riskLevel === riskLevel);
  }

  res.json({ logs: filteredLogs.slice(0, limit), totalCount: filteredLogs.length });
});

app.post('/api/clear-logs', (req, res) => {
  requestLogs.length = 0;
  res.json({ success: true, message: 'Logs cleared successfully' });
});

app.post('/api/reset-metrics', (req, res) => {
  metrics.totalRequests = 0;
  metrics.successRequests = 0;
  metrics.failedRequests = 0;
  metrics.blockedRequests = 0;
  metrics.requestsByRiskLevel = { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 };
  metrics.requestsByEndpoint = {};
  metrics.requestsByMethod = { GET: 0, POST: 0, PUT: 0, DELETE: 0 };
  metrics.averageRiskScore = 0;
  metrics.totalRiskScore = 0;
  metrics.averageResponseTime = 0;
  metrics.totalResponseTime = 0;
  metrics.triggeredRules = {
    RAPID_FIRE: 0,
    PAYLOAD_ANOMALY: 0,
    TIME_BASED: 0,
    SEQUENTIAL_PATTERN: 0,
    GEO_VELOCITY: 0
  };
  metrics.startTime = Date.now();
  fraudEngine.clearHistory();
  res.json({ success: true, message: 'Metrics reset successfully' });
});

app.get('/api/fraud-patterns', (req, res) => {
  const patterns = [];
  const rules = [
    {
      key: 'RAPID_FIRE',
      type: 'Rapid Fire Attack',
      description: 'Multiple requests from same source in short time period'
    },
    {
      key: 'PAYLOAD_ANOMALY',
      type: 'Payload Anomaly',
      description: 'Unusual transaction amounts or statistical outliers detected'
    },
    {
      key: 'TIME_BASED',
      type: 'Off-Hours Activity',
      description: 'Suspicious activity during unusual hours (outside 9AM-9PM)'
    },
    {
      key: 'SEQUENTIAL_PATTERN',
      type: 'Replay Attack',
      description: 'Identical request payload submitted multiple times'
    }
  ];

  for (const rule of rules) {
    const count = metrics.triggeredRules[rule.key];
    if (count > 0) {
      patterns.push({
        id: rule.key.toLowerCase().replace('_', '-'),
        type: rule.type,
        severity: count > 10 ? 'high' : count > 5 ? 'medium' : 'low',
        count,
        description: rule.description,
        lastDetected: new Date().toISOString()
      });
    }
  }

  res.json({ patterns, totalPatterns: patterns.length, timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    port: PORT,
    uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback — must be last
app.get('*', (req, res) => {
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});
