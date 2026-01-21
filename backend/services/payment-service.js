const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

const transactions = new Map();

app.post('/api/payments', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, amount, currency, recipient, description } = req.body;

  if (!userId || !amount || !currency) {
    return res.status(400).json({
      error: 'Missing required fields',
      correlationId
    });
  }

  const transactionId = `txn_${uuidv4().substring(0, 8)}`;
  const transaction = {
    transactionId,
    userId,
    amount,
    currency,
    recipient: recipient || 'unknown',
    description: description || 'Payment transaction',
    status: 'completed',
    timestamp: new Date().toISOString(),
    correlationId
  };

  transactions.set(transactionId, transaction);

  setTimeout(() => {
    res.status(200).json({
      success: true,
      transactionId,
      status: 'completed',
      amount,
      currency,
      timestamp: transaction.timestamp,
      correlationId,
      message: 'Payment processed successfully'
    });
  }, Math.random() * 100 + 20);
});

app.get('/api/payments/:transactionId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { transactionId } = req.params;

  const transaction = transactions.get(transactionId);

  if (!transaction) {
    return res.status(404).json({
      error: 'Transaction not found',
      transactionId,
      correlationId
    });
  }

  res.status(200).json({
    ...transaction,
    correlationId
  });
});

app.get('/api/payments/user/:userId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId } = req.params;

  const userTransactions = Array.from(transactions.values())
    .filter(t => t.userId === userId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.status(200).json({
    userId,
    transactions: userTransactions,
    totalCount: userTransactions.length,
    correlationId
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'payment-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
});

// Made with Bob
