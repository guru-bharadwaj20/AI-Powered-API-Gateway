'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const createLogger = require('../shared/logger');

const log = createLogger('account-service');
const app = express();
const PORT = 3002;

app.use(express.json({ limit: '64kb' }));

// In-memory store with seed data
const accounts = new Map([
  ['acc_12345', {
    accountId:    'acc_12345',
    userId:       'user_12345',
    accountType:  'checking',
    balance:      15000,
    currency:     'USD',
    status:       'active',
    createdAt:    '2024-01-15T10:30:00Z',
    lastActivity: new Date().toISOString()
  }],
  ['acc_67890', {
    accountId:    'acc_67890',
    userId:       'user_67890',
    accountType:  'savings',
    balance:      50000,
    currency:     'USD',
    status:       'active',
    createdAt:    '2023-06-20T14:20:00Z',
    lastActivity: new Date().toISOString()
  }]
]);

// ── routes ─────────────────────────────────────────────────────────────────────

app.post('/api/accounts', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, accountType, initialBalance } = req.body;

  if (!userId || !accountType) {
    return res.status(400).json({ error: 'Missing required fields', correlationId });
  }

  const accountId = `acc_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const account = {
    accountId,
    userId,
    accountType,
    balance:      Number(initialBalance) || 0,
    currency:     'USD',
    status:       'active',
    createdAt:    new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  accounts.set(accountId, account);
  log.info({ accountId, userId, accountType, correlationId }, 'account created');

  res.status(201).json({
    success:   true,
    accountId,
    status:    'active',
    correlationId,
    message:   'Account created successfully'
  });
});

app.get('/api/accounts/:accountId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const account = accounts.get(req.params.accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found', accountId: req.params.accountId, correlationId });
  }

  setTimeout(() => {
    res.status(200).json({ ...account, correlationId, retrievedAt: new Date().toISOString() });
  }, Math.floor(Math.random() * 40) + 10);
});

app.put('/api/accounts/:accountId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { accountId } = req.params;
  const account = accounts.get(accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found', accountId, correlationId });
  }

  const { status, accountType } = req.body;
  const updated = { ...account, lastActivity: new Date().toISOString() };
  if (status)      updated.status      = status;
  if (accountType) updated.accountType = accountType;

  accounts.set(accountId, updated);
  log.info({ accountId, updatedFields: Object.keys(req.body), correlationId }, 'account updated');

  res.status(200).json({
    success:       true,
    accountId,
    updatedFields: Object.keys(req.body),
    correlationId,
    message:       'Account updated successfully'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    service:      'account-service',
    status:       'healthy',
    port:         PORT,
    accountCount: accounts.size,
    timestamp:    new Date().toISOString()
  });
});

// ── start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info({ port: PORT }, 'Account Service started');
});
