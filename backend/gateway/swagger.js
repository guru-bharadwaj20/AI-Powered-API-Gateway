'use strict';

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API Gateway',
    description: `Rule-Based API Gateway with Explainable Fraud Detection.

All requests are scored by the Fraud Detection Engine (port 4001) before being forwarded to downstream services.
Requests exceeding the HIGH_RISK threshold are blocked with a 403 response.

**Authentication** (optional): Set \`REQUIRE_AUTH=true\` and \`JWT_SECRET\` in environment.
Obtain a token via \`POST /api/auth/token\` and pass it as \`Authorization: Bearer <token>\`.`,
    version: '2.0.0',
    contact: { name: 'API Gateway' }
  },
  servers: [{ url: 'http://localhost:4000', description: 'Local development' }],

  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      RiskDecision: {
        type: 'object',
        properties: {
          riskScore:     { type: 'number', minimum: 0, maximum: 100 },
          riskLevel:     { type: 'string', enum: ['NORMAL', 'SUSPICIOUS', 'HIGH_RISK'] },
          confidence:    { type: 'number', minimum: 0, maximum: 1 },
          recommendation:{ type: 'string', enum: ['ALLOW_NORMAL', 'ALLOW_WITH_MONITORING', 'REQUIRE_ADDITIONAL_AUTH', 'BLOCK_AND_VERIFY'] },
          triggeredRules:{ type: 'array', items: { type: 'object' } },
          reasons:       { type: 'array', items: { type: 'string' } },
          explanation:   { type: 'string' }
        }
      },
      BlockedResponse: {
        type: 'object',
        properties: {
          error:         { type: 'string', example: 'Request blocked' },
          riskScore:     { type: 'number' },
          riskLevel:     { type: 'string' },
          confidence:    { type: 'number' },
          explanation:   { type: 'string' },
          reasons:       { type: 'array', items: { type: 'string' } },
          correlationId: { type: 'string' }
        }
      },
      ValidationError: {
        type: 'object',
        properties: {
          error:  { type: 'string', example: 'Validation failed' },
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field:   { type: 'string' },
                message: { type: 'string' },
                code:    { type: 'string' }
              }
            }
          }
        }
      }
    }
  },

  paths: {
    '/api/auth/token': {
      post: {
        tags: ['Auth'],
        summary: 'Obtain a JWT token',
        description: 'Returns a signed JWT for use in the Authorization header. Only available when JWT_SECRET is configured.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'password' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Token issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token:     { type: 'string' },
                    expiresIn: { type: 'string' },
                    role:      { type: 'string' }
                  }
                }
              }
            }
          },
          503: { description: 'JWT not configured on this server' }
        }
      }
    },

    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Create a payment',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'amount', 'currency'],
                properties: {
                  userId:      { type: 'string', example: 'user-123' },
                  amount:      { type: 'number', minimum: 0.01, example: 250.00 },
                  currency:    { type: 'string', length: 3, example: 'USD' },
                  recipient:   { type: 'string', example: 'acct-456' },
                  description: { type: 'string', example: 'Invoice payment' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Payment created' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
          403: { description: 'Blocked by fraud detection', content: { 'application/json': { schema: { $ref: '#/components/schemas/BlockedResponse' } } } },
          429: { description: 'Rate limit exceeded' },
          503: { description: 'Payment service unavailable' }
        }
      }
    },

    '/api/payments/{transactionId}': {
      get: {
        tags: ['Payments'],
        summary: 'Get payment by transaction ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'transactionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Payment details' },
          403: { description: 'Blocked by fraud detection' },
          503: { description: 'Payment service unavailable' }
        }
      }
    },

    '/api/accounts': {
      post: {
        tags: ['Accounts'],
        summary: 'Create an account',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'accountType'],
                properties: {
                  userId:         { type: 'string', example: 'user-123' },
                  accountType:    { type: 'string', enum: ['checking', 'savings', 'business', 'investment'] },
                  initialBalance: { type: 'number', minimum: 0, example: 1000 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Account created' },
          400: { description: 'Validation error' },
          403: { description: 'Blocked by fraud detection' },
          503: { description: 'Account service unavailable' }
        }
      }
    },

    '/api/accounts/{accountId}': {
      get: {
        tags: ['Accounts'],
        summary: 'Get account by ID',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Account details' }, 503: { description: 'Account service unavailable' } }
      },
      put: {
        tags: ['Accounts'],
        summary: 'Update an account',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'accountId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status:      { type: 'string', enum: ['active', 'frozen', 'closed'] },
                  accountType: { type: 'string', enum: ['checking', 'savings', 'business', 'investment'] }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Account updated' }, 400: { description: 'Validation error' } }
      }
    },

    '/api/verify/identity': {
      post: {
        tags: ['Verification'],
        summary: 'Verify user identity',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'documentType', 'documentNumber'],
                properties: {
                  userId:         { type: 'string', example: 'user-123' },
                  documentType:   { type: 'string', enum: ['passport', 'drivers_license', 'national_id', 'residence_permit'] },
                  documentNumber: { type: 'string', example: 'P123456789' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Identity verification result' }, 403: { description: 'Blocked by fraud detection' } }
      }
    },

    '/api/verify/transaction': {
      post: {
        tags: ['Verification'],
        summary: 'Verify a transaction',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['transactionId', 'userId'],
                properties: {
                  transactionId:    { type: 'string', example: 'txn-abc123' },
                  userId:           { type: 'string', example: 'user-123' },
                  verificationCode: { type: 'string', minLength: 6, maxLength: 6, example: '123456' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Transaction verification result' } }
      }
    },

    '/health': {
      get: {
        tags: ['System'],
        summary: 'Gateway health check',
        responses: { 200: { description: 'Service is healthy' } }
      }
    },

    '/metrics': {
      get: {
        tags: ['System'],
        summary: 'Operational metrics (JSON)',
        description: 'Returns request counts, risk distribution, latency percentiles, and fraud rule trigger counts.',
        responses: { 200: { description: 'Metrics payload' } }
      }
    },

    '/metrics/prometheus': {
      get: {
        tags: ['System'],
        summary: 'Prometheus-compatible metrics',
        responses: { 200: { description: 'text/plain metrics in Prometheus exposition format' } }
      }
    },

    '/logs': {
      get: {
        tags: ['Logs'],
        summary: 'Request log',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'riskLevel', in: 'query', schema: { type: 'string', enum: ['NORMAL', 'SUSPICIOUS', 'HIGH_RISK'] } },
          { name: 'endpoint', in: 'query', schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Paginated log entries' } }
      }
    },

    '/logs/timeline': {
      get: {
        tags: ['Logs'],
        summary: 'Minute-by-minute request timeline',
        parameters: [{ name: 'minutes', in: 'query', schema: { type: 'integer', default: 15, maximum: 60 } }],
        responses: { 200: { description: 'Array of per-minute risk breakdown' } }
      }
    },

    '/logs/endpoint-heatmap': {
      get: {
        tags: ['Logs'],
        summary: 'Request counts per endpoint',
        responses: { 200: { description: 'Endpoint → count map' } }
      }
    },

    '/logs/fraud-events': {
      get: {
        tags: ['Logs'],
        summary: 'HIGH_RISK fraud events',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }],
        responses: { 200: { description: 'Fraud event log' } }
      }
    },

    '/api/fraud-patterns': {
      get: {
        tags: ['System'],
        summary: 'Triggered fraud rule summary',
        responses: { 200: { description: 'Pattern frequency table' } }
      }
    },

    '/api/clear-logs': {
      post: {
        tags: ['System'],
        summary: 'Clear persisted request logs',
        responses: { 200: { description: 'Logs cleared' } }
      }
    },

    '/api/reset-metrics': {
      post: {
        tags: ['System'],
        summary: 'Reset all metrics and logs',
        responses: { 200: { description: 'All state cleared' } }
      }
    }
  }
};
