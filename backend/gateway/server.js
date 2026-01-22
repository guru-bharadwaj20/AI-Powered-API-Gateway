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
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
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
          resolve({
            status: res.statusCode,
            data: jsonData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: { message: data }
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (method !== 'GET' && body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

app.use((req, res, next) => {
  const correlationId = uuidv4();
  req.correlationId = correlationId;
  req.startTime = Date.now();
  
  res.setHeader('X-Correlation-ID', correlationId);
  
  next();
});

app.post('/api/payments', async (req, res) => {
  const endpoint = '/api/payments';
  
  if (!metrics.requestsByEndpoint[endpoint]) {
    metrics.requestsByEndpoint[endpoint] = 0;
  }
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: req.ip || req.connection.remoteAddress,
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
      request: {
        method: 'POST',
        endpoint,
        body: req.body,
        ipAddress: requestData.ipAddress
      },
      aiDecision,
      routing: {
        targetService: 'payment-service',
        routingDecision: 'BLOCKED',
        reason: 'Risk score exceeds threshold'
      },
      response: {
        statusCode: 403,
        responseTime
      }
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
    const targetUrl = `http://localhost:3001${endpoint}`;
    const result = await forwardRequest(targetUrl, 'POST', {
      'X-Correlation-ID': req.correlationId,
      'X-Risk-Score': aiDecision.riskScore,
      'X-Risk-Level': aiDecision.riskLevel
    }, req.body);

    const finalResponseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, finalResponseTime);

    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: {
        method: 'POST',
        endpoint,
        body: req.body,
        ipAddress: requestData.ipAddress
      },
      aiDecision,
      routing: {
        targetService: 'payment-service',
        routingDecision: 'ALLOWED',
        reason: aiDecision.riskLevel === 'SUSPICIOUS' ? 'Allowed with monitoring' : 'Normal traffic'
      },
      response: {
        statusCode: result.status,
        responseTime: finalResponseTime,
        body: result.data
      }
    });

    res.status(result.status).json({
      ...result.data,
      riskScore: aiDecision.riskScore,
      riskLevel: aiDecision.riskLevel
    });
  } catch (error) {
    const errorResponseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, 503, errorResponseTime);
    
    res.status(503).json({
      error: 'Payment service unavailable',
      correlationId: req.correlationId
    });
  }
});

app.get('/api/payments/:transactionId', async (req, res) => {
  const endpoint = `/api/payments/${req.params.transactionId}`;
  const baseEndpoint = '/api/payments/:transactionId';
  
  if (!metrics.requestsByEndpoint[baseEndpoint]) {
    metrics.requestsByEndpoint[baseEndpoint] = 0;
  }
  metrics.requestsByEndpoint[baseEndpoint]++;
  metrics.requestsByMethod.GET++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    endpoint: baseEndpoint,
    method: 'GET',
    body: {}
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const targetUrl = `http://localhost:3001${endpoint}`;
    const result = await forwardRequest(targetUrl, 'GET', {
      'X-Correlation-ID': req.correlationId
    });

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);

    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: {
        method: 'GET',
        endpoint: baseEndpoint,
        params: req.params,
        ipAddress: requestData.ipAddress
      },
      aiDecision,
      routing: {
        targetService: 'payment-service',
        routingDecision: 'ALLOWED'
      },
      response: {
        statusCode: result.status,
        responseTime
      }
    });

    res.status(result.status).json({
      ...result.data,
      riskScore: aiDecision.riskScore
    });
  } catch (error) {
    res.status(503).json({
      error: 'Payment service unavailable',
      correlationId: req.correlationId
    });
  }
});

app.get('/api/accounts/:accountId', async (req, res) => {
  const endpoint = `/api/accounts/${req.params.accountId}`;
  const baseEndpoint = '/api/accounts/:accountId';
  
  if (!metrics.requestsByEndpoint[baseEndpoint]) {
    metrics.requestsByEndpoint[baseEndpoint] = 0;
  }
  metrics.requestsByEndpoint[baseEndpoint]++;
  metrics.requestsByMethod.GET++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    endpoint: baseEndpoint,
    method: 'GET',
    body: {}
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const targetUrl = `http://localhost:3002${endpoint}`;
    const result = await forwardRequest(targetUrl, 'GET', {
      'X-Correlation-ID': req.correlationId
    });

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);

    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: {
        method: 'GET',
        endpoint: baseEndpoint,
        params: req.params,
        ipAddress: requestData.ipAddress
      },
      aiDecision,
      routing: {
        targetService: 'account-service',
        routingDecision: 'ALLOWED'
      },
      response: {
        statusCode: result.status,
        responseTime
      }
    });

    res.status(result.status).json({
      ...result.data,
      riskScore: aiDecision.riskScore
    });
  } catch (error) {
    res.status(503).json({
      error: 'Account service unavailable',
      correlationId: req.correlationId
    });
  }
});

app.post('/api/verify/identity', async (req, res) => {
  const endpoint = '/api/verify/identity';
  
  if (!metrics.requestsByEndpoint[endpoint]) {
    metrics.requestsByEndpoint[endpoint] = 0;
  }
  metrics.requestsByEndpoint[endpoint]++;
  metrics.requestsByMethod.POST++;

  const requestData = {
    correlationId: req.correlationId,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    endpoint,
    method: 'POST',
    body: req.body
  };

  const aiDecision = fraudEngine.analyzeRequest(requestData);
  
  res.setHeader('X-Risk-Score', aiDecision.riskScore);
  res.setHeader('X-Risk-Level', aiDecision.riskLevel);

  try {
    const targetUrl = `http://localhost:3003${endpoint}`;
    const result = await forwardRequest(targetUrl, 'POST', {
      'X-Correlation-ID': req.correlationId
    }, req.body);

    const responseTime = Date.now() - req.startTime;
    updateMetrics(aiDecision, result.status, responseTime);

    logRequest({
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      request: {
        method: 'POST',
        endpoint,
        body: req.body,
        ipAddress: requestData.ipAddress
      },
      aiDecision,
      routing: {
        targetService: 'verification-service',
        routingDecision: 'ALLOWED'
      },
      response: {
        statusCode: result.status,
        responseTime
      }
    });

    res.status(result.status).json({
      ...result.data,
      riskScore: aiDecision.riskScore
    });
  } catch (error) {
    res.status(503).json({
      error: 'Verification service unavailable',
      correlationId: req.correlationId
    });
  }
});

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
    ai: {
      triggeredRules: metrics.triggeredRules
    },
    performance: {
      averageResponseTime: metrics.averageResponseTime
    }
  });
});

app.get('/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const riskLevel = req.query.riskLevel;
  
  let filteredLogs = requestLogs;
  
  if (riskLevel) {
    filteredLogs = requestLogs.filter(log => 
      log.aiDecision.riskLevel === riskLevel
    );
  }
  
  res.json({
    logs: filteredLogs.slice(0, limit),
    totalCount: filteredLogs.length
  });
});

app.post('/api/clear-logs', (req, res) => {
  requestLogs.length = 0;
  res.json({
    success: true,
    message: 'Logs cleared successfully'
  });
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
  
  res.json({
    success: true,
    message: 'Metrics reset successfully'
  });
});

app.get('/api/fraud-patterns', (req, res) => {
  const patterns = [];
  
  // Analyze triggered rules to create fraud patterns
  if (metrics.triggeredRules.RAPID_FIRE > 0) {
    patterns.push({
      id: 'rapid-fire',
      type: 'Rapid Fire Attack',
      severity: metrics.triggeredRules.RAPID_FIRE > 10 ? 'high' : metrics.triggeredRules.RAPID_FIRE > 5 ? 'medium' : 'low',
      count: metrics.triggeredRules.RAPID_FIRE,
      description: 'Multiple requests from same source in short time period',
      lastDetected: new Date().toISOString()
    });
  }
  
  if (metrics.triggeredRules.PAYLOAD_ANOMALY > 0) {
    patterns.push({
      id: 'payload-anomaly',
      type: 'Payload Anomaly',
      severity: metrics.triggeredRules.PAYLOAD_ANOMALY > 10 ? 'high' : metrics.triggeredRules.PAYLOAD_ANOMALY > 5 ? 'medium' : 'low',
      count: metrics.triggeredRules.PAYLOAD_ANOMALY,
      description: 'Unusual transaction amounts or patterns detected',
      lastDetected: new Date().toISOString()
    });
  }
  
  if (metrics.triggeredRules.TIME_BASED > 0) {
    patterns.push({
      id: 'time-based',
      type: 'Off-Hours Activity',
      severity: metrics.triggeredRules.TIME_BASED > 10 ? 'high' : metrics.triggeredRules.TIME_BASED > 5 ? 'medium' : 'low',
      count: metrics.triggeredRules.TIME_BASED,
      description: 'Suspicious activity during unusual hours',
      lastDetected: new Date().toISOString()
    });
  }
  
  if (metrics.triggeredRules.SEQUENTIAL_PATTERN > 0) {
    patterns.push({
      id: 'sequential',
      type: 'Sequential Pattern',
      severity: metrics.triggeredRules.SEQUENTIAL_PATTERN > 10 ? 'high' : metrics.triggeredRules.SEQUENTIAL_PATTERN > 5 ? 'medium' : 'low',
      count: metrics.triggeredRules.SEQUENTIAL_PATTERN,
      description: 'Coordinated attack pattern detected',
      lastDetected: new Date().toISOString()
    });
  }
  
  res.json({
    patterns,
    totalPatterns: patterns.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', async (req, res) => {
  const testData = req.body;
  
  try {
    // Validate JSON
    if (!testData || typeof testData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid JSON payload',
        message: 'Request body must be a valid JSON object'
      });
    }
    
    // Determine endpoint from test data
    let endpoint = '/api/payments';
    let method = 'POST';
    
    if (testData.endpoint) {
      endpoint = testData.endpoint;
      delete testData.endpoint;
    }
    
    if (testData.method) {
      method = testData.method;
      delete testData.method;
    }
    
    // Forward the test request through the gateway
    const targetUrl = `http://localhost:3000${endpoint}`;
    const result = await forwardRequest(targetUrl, method, {
      'X-Correlation-ID': req.correlationId,
      'X-Test-Request': 'true'
    }, testData);
    
    res.json({
      success: true,
      testRequest: testData,
      response: result.data,
      statusCode: result.status,
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process test request'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

// Made with Bob
