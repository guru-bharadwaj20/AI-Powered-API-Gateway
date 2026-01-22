import React from 'react';

const DetailModal = ({ content, onClose }) => {
  if (!content) return null;

  const renderContent = () => {
    // If it's a log detail
    if (content.correlationId) {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Request Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Correlation ID" value={content.correlationId} />
              <DetailItem label="Timestamp" value={content.timestamp} />
              <DetailItem label="Method" value={content.request?.method} />
              <DetailItem label="Endpoint" value={content.request?.endpoint} />
              <DetailItem label="IP Address" value={content.request?.ipAddress} />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">AI Risk Assessment</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem 
                label="Risk Score" 
                value={`${content.aiDecision?.riskScore} (${content.aiDecision?.riskLevel})`} 
              />
              <DetailItem label="Recommendation" value={content.aiDecision?.recommendation} />
              <div className="col-span-2">
                <DetailItem label="Explanation" value={content.aiDecision?.explanation} />
              </div>
            </div>
          </div>

          {content.aiDecision?.triggeredRules?.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Triggered Rules</h3>
              <div className="space-y-3">
                {content.aiDecision.triggeredRules.map((rule, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-gray-900">{rule.ruleName}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        rule.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 
                        rule.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-green-100 text-green-700'
                      }`}>
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{rule.reasoning}</p>
                    <div className="text-xs text-gray-500">
                      Confidence: {(rule.confidence * 100).toFixed(0)}% | Score: {rule.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Response</h3>
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Status Code" value={content.response?.statusCode} />
              <DetailItem label="Response Time" value={`${content.response?.responseTime}ms`} />
              <DetailItem label="Routing Decision" value={content.routing?.routingDecision} />
            </div>
          </div>
        </div>
      );
    }

    // If it's analysis content
    if (content.title === 'Traffic Pattern Analysis') {
      return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Traffic Pattern Analysis</h3>
            <p className="text-gray-600 mb-4">
              Analysis based on last {content.data.totalLogs} requests
            </p>

            <h4 className="font-semibold text-gray-900 mb-3">Top Source IPs</h4>
            <table className="w-full mb-6">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">IP Address</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Request Count</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {content.data.topIPs.map(([ip, count], index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-sm text-gray-900">{ip}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{count}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {((count / content.data.totalLogs) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="font-semibold text-gray-900 mb-3">Most Accessed Endpoints</h4>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Endpoint</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Request Count</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {content.data.topEndpoints.map(([endpoint, count], index) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-sm text-gray-900">{endpoint}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{count}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {((count / content.data.totalLogs) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return <div className="text-gray-600">No details available</div>;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-large max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Request Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div>
    <div className="text-sm font-medium text-gray-500 mb-1">{label}:</div>
    <div className="text-sm text-gray-900">{value || 'N/A'}</div>
  </div>
);

export default DetailModal;
