import React, { useState } from 'react';

const requestBodyTemplates = {
  '/api/payments': {
    userId: 'user_12345',
    amount: 500,
    currency: 'USD',
    recipient: 'merchant_789',
    description: 'Test payment transaction'
  },
  '/api/accounts/:accountId': {},
  '/api/payments/:transactionId': {},
  '/api/verify/identity': {
    userId: 'user_12345',
    documentType: 'passport',
    documentNumber: 'AB123456'
  }
};

const TestPanel = ({ onSendRequest }) => {
  const [endpoint, setEndpoint] = useState('/api/payments');
  const [requestBody, setRequestBody] = useState(JSON.stringify(requestBodyTemplates['/api/payments'], null, 2));
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleEndpointChange = (e) => {
    const newEndpoint = e.target.value;
    setEndpoint(newEndpoint);
    setRequestBody(JSON.stringify(requestBodyTemplates[newEndpoint], null, 2));
  };

  const handleSendRequest = async () => {
    setLoading(true);
    try {
      let url = endpoint;
      let method = 'POST';
      let body = null;

      if (endpoint.includes(':accountId')) {
        url = '/api/accounts/acc_12345';
        method = 'GET';
      } else if (endpoint.includes(':transactionId')) {
        url = '/api/payments/txn_12345';
        method = 'GET';
      } else {
        body = JSON.parse(requestBody);
      }

      const result = await onSendRequest(url, body, method);
      setResponse(result);
    } catch (error) {
      setResponse({ status: 500, data: { error: error.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5">
          Select Endpoint:
        </label>
        <select
          value={endpoint}
          onChange={handleEndpointChange}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="/api/payments">POST /api/payments</option>
          <option value="/api/accounts/:accountId">GET /api/accounts/:accountId</option>
          <option value="/api/payments/:transactionId">GET /api/payments/:transactionId</option>
          <option value="/api/verify/identity">POST /api/verify/identity</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Request Body (JSON):
        </label>
        <textarea
          value={requestBody}
          onChange={(e) => setRequestBody(e.target.value)}
          rows={6}
          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono text-xs sm:text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <button
        onClick={handleSendRequest}
        disabled={loading}
        className="w-full gradient-primary text-white px-3 py-2 text-sm rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <span>{loading ? '⏳' : '🚀'}</span>
        <span>{loading ? 'Sending...' : 'Send Request'}</span>
      </button>

      {response && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="mb-2">
            <strong>Status:</strong>{' '}
            <span className={response.status >= 200 && response.status < 300 ? 'text-green-600' : 'text-red-600'}>
              {response.status}
            </span>
          </div>
          <div>
            <strong>Response:</strong>
          </div>
          <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default TestPanel;
