'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const createLogger = require('../shared/logger');

const log = createLogger('verification-service');
const app = express();
const PORT = 3003;

app.use(express.json({ limit: '64kb' }));

const verifications = new Map();

// ── routes ─────────────────────────────────────────────────────────────────────

app.post('/api/verify/identity', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, documentType, documentNumber } = req.body;

  if (!userId || !documentType || !documentNumber) {
    return res.status(400).json({ error: 'Missing required fields', correlationId });
  }

  const verificationId = `ver_${uuidv4().replace(/-/g, '').slice(0, 8)}`;
  const record = {
    verificationId,
    userId,
    documentType,
    documentNumber: `${documentNumber.slice(0, 2)}***`,   // mask PII
    status:     'verified',
    confidence: 0.95,
    timestamp:  new Date().toISOString(),
    correlationId
  };

  verifications.set(verificationId, record);
  log.info({ verificationId, userId, documentType, correlationId }, 'identity verified');

  setTimeout(() => {
    res.status(200).json({
      success:        true,
      verificationId,
      status:         'verified',
      confidence:     record.confidence,
      correlationId,
      message:        'Identity verification successful'
    });
  }, Math.floor(Math.random() * 150) + 100);
});

app.post('/api/verify/transaction', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { transactionId, userId, verificationCode } = req.body;

  if (!transactionId || !userId) {
    return res.status(400).json({ error: 'Missing required fields', correlationId });
  }

  const verified   = verificationCode === '123456' || Math.random() > 0.25;
  const confidence = verified ? 0.92 : 0.45;

  log.info({ transactionId, userId, verified, correlationId }, 'transaction verification');

  setTimeout(() => {
    res.status(200).json({
      verified,
      confidence,
      transactionId,
      reasoning: verified
        ? 'Transaction verified successfully'
        : 'Verification code invalid or transaction pattern suspicious',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }, Math.floor(Math.random() * 120) + 80);
});

app.get('/api/verify/status/:verificationId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const verification  = verifications.get(req.params.verificationId);

  if (!verification) {
    return res.status(404).json({ error: 'Verification not found', verificationId: req.params.verificationId, correlationId });
  }

  res.status(200).json({ ...verification, correlationId });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    service:           'verification-service',
    status:            'healthy',
    port:              PORT,
    verificationCount: verifications.size,
    timestamp:         new Date().toISOString()
  });
});

// ── start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info({ port: PORT }, 'Verification Service started');
});
