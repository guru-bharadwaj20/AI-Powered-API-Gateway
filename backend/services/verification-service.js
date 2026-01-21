const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3003;

app.use(bodyParser.json());

const verifications = new Map();

app.post('/api/verify/identity', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, documentType, documentNumber } = req.body;

  if (!userId || !documentType || !documentNumber) {
    return res.status(400).json({
      error: 'Missing required fields',
      correlationId
    });
  }

  const verificationId = `ver_${uuidv4().substring(0, 8)}`;
  const verification = {
    verificationId,
    userId,
    documentType,
    status: 'verified',
    confidence: 0.95,
    timestamp: new Date().toISOString(),
    correlationId
  };

  verifications.set(verificationId, verification);

  setTimeout(() => {
    res.status(200).json({
      success: true,
      verificationId,
      status: 'verified',
      confidence: 0.95,
      correlationId,
      message: 'Identity verification successful'
    });
  }, Math.random() * 200 + 100);
});

app.post('/api/verify/transaction', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { transactionId, userId, verificationCode } = req.body;

  if (!transactionId || !userId) {
    return res.status(400).json({
      error: 'Missing required fields',
      correlationId
    });
  }

  const verified = verificationCode === '123456' || Math.random() > 0.3;
  const confidence = verified ? 0.92 : 0.45;

  setTimeout(() => {
    res.status(200).json({
      verified,
      confidence,
      transactionId,
      reasoning: verified 
        ? 'Transaction verified successfully' 
        : 'Verification code invalid or transaction suspicious',
      correlationId,
      timestamp: new Date().toISOString()
    });
  }, Math.random() * 150 + 80);
});

app.get('/api/verify/status/:verificationId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { verificationId } = req.params;

  const verification = verifications.get(verificationId);

  if (!verification) {
    return res.status(404).json({
      error: 'Verification not found',
      verificationId,
      correlationId
    });
  }

  res.status(200).json({
    ...verification,
    correlationId
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'verification-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Verification Service running on port ${PORT}`);
});

// Made with Bob
