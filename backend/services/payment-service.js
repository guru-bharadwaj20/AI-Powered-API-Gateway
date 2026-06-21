'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const createLogger = require('../shared/logger');

const log = createLogger('payment-service');
const app = express();
const PORT = 3001;

app.use(express.json({ limit: '64kb' }));

// In-memory store (gateway has already validated the request)
const transactions = new Map();

// ── routes ─────────────────────────────────────────────────────────────────────

app.post('/api/payments', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, amount, currency, recipient, description } = req.body;

  if (!userId || !amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields', correlationId });
  }

  const transactionId = `txn_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
  const transaction = {
    transactionId,
    userId,
    amount:      Number(amount),
    currency:    currency.toUpperCase(),
    recipient:   recipient || 'unknown',
    description: description || 'Payment transaction',
    status:      'completed',
    timestamp:   new Date().toISOString(),
    correlationId
  };

  transactions.set(transactionId, transaction);

  log.info({ transactionId, userId, amount, currency, correlationId }, 'payment processed');

  // Simulate realistic upstream latency
  setTimeout(() => {
    res.status(200).json({
      success:       true,
      transactionId,
      status:        'completed',
      amount:        transaction.amount,
      currency:      transaction.currency,
      timestamp:     transaction.timestamp,
      correlationId,
      message:       'Payment processed successfully'
    });
  }, Math.floor(Math.random() * 80) + 20);
});

app.get('/api/payments/:transactionId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { transactionId } = req.params;
  const transaction = transactions.get(transactionId);

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found', transactionId, correlationId });
  }

  res.status(200).json({ ...transaction, correlationId });
});

app.get('/api/payments/user/:userId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const userTxns = [...transactions.values()]
    .filter(t => t.userId === req.params.userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.status(200).json({
    userId:       req.params.userId,
    transactions: userTxns,
    totalCount:   userTxns.length,
    correlationId
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    service:          'payment-service',
    status:           'healthy',
    port:             PORT,
    transactionCount: transactions.size,
    timestamp:        new Date().toISOString()
  });
});

// ── start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info({ port: PORT }, 'Payment Service started');
});
