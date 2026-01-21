const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3002;

app.use(bodyParser.json());

const accounts = new Map();

accounts.set('acc_12345', {
  accountId: 'acc_12345',
  userId: 'user_12345',
  accountType: 'checking',
  balance: 15000,
  currency: 'USD',
  status: 'active',
  createdAt: '2024-01-15T10:30:00Z',
  lastActivity: new Date().toISOString()
});

accounts.set('acc_67890', {
  accountId: 'acc_67890',
  userId: 'user_67890',
  accountType: 'savings',
  balance: 50000,
  currency: 'USD',
  status: 'active',
  createdAt: '2023-06-20T14:20:00Z',
  lastActivity: new Date().toISOString()
});

app.get('/api/accounts/:accountId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { accountId } = req.params;

  const account = accounts.get(accountId);

  if (!account) {
    return res.status(404).json({
      error: 'Account not found',
      accountId,
      correlationId
    });
  }

  setTimeout(() => {
    res.status(200).json({
      ...account,
      correlationId,
      retrievedAt: new Date().toISOString()
    });
  }, Math.random() * 50 + 10);
});

app.post('/api/accounts', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { userId, accountType, initialBalance } = req.body;

  if (!userId || !accountType) {
    return res.status(400).json({
      error: 'Missing required fields',
      correlationId
    });
  }

  const accountId = `acc_${uuidv4().substring(0, 8)}`;
  const account = {
    accountId,
    userId,
    accountType,
    balance: initialBalance || 0,
    currency: 'USD',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  accounts.set(accountId, account);

  res.status(201).json({
    success: true,
    accountId,
    status: 'active',
    correlationId,
    message: 'Account created successfully'
  });
});

app.put('/api/accounts/:accountId', (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { accountId } = req.params;
  const updates = req.body;

  const account = accounts.get(accountId);

  if (!account) {
    return res.status(404).json({
      error: 'Account not found',
      accountId,
      correlationId
    });
  }

  const updatedAccount = {
    ...account,
    ...updates,
    accountId,
    lastActivity: new Date().toISOString()
  };

  accounts.set(accountId, updatedAccount);

  res.status(200).json({
    success: true,
    accountId,
    updatedFields: Object.keys(updates),
    correlationId,
    message: 'Account updated successfully'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'account-service',
    status: 'healthy',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Account Service running on port ${PORT}`);
});

// Made with Bob
