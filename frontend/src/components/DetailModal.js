import React from 'react';

const DetailModal = ({ content, onClose }) => {
  if (!content) return null;

  const renderContent = () => {
    // Individual log detail
    if (content.correlationId) {
      // support both riskDecision (new) and aiDecision (old) field names
      const rd = content.riskDecision || content.aiDecision || {};
      const riskColors = {
        NORMAL:    'text-emerald-700 bg-emerald-50',
        SUSPICIOUS:'text-amber-700 bg-amber-50',
        HIGH_RISK: 'text-red-700 bg-red-50'
      };
      const riskColor = riskColors[rd.riskLevel] || 'text-gray-700 bg-gray-50';

      return (
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded" />Request Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Correlation ID"  value={content.correlationId} mono />
              <DetailItem label="Timestamp"       value={new Date(content.timestamp).toLocaleString()} />
              <DetailItem label="Method"          value={content.request?.method} />
              <DetailItem label="Endpoint"        value={content.request?.endpoint} />
              <DetailItem label="IP Address"      value={content.request?.ipAddress} mono />
              <DetailItem label="Status Code"     value={content.response?.statusCode} />
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-violet-500 rounded" />Risk Assessment
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Risk Score</div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${riskColor}`}>
                  {rd.riskScore} — {rd.riskLevel}
                </div>
              </div>
              <DetailItem label="Confidence"       value={rd.confidence != null ? `${Math.round(rd.confidence * 100)}%` : undefined} />
              <DetailItem label="Recommendation"   value={rd.recommendation} />
              <DetailItem label="Response Time"    value={content.response?.responseTime ? `${content.response.responseTime}ms` : undefined} />
              <div className="col-span-2">
                <DetailItem label="Explanation"    value={rd.explanation} />
              </div>
              <DetailItem label="Routing Decision" value={content.routing?.routingDecision} />
              <DetailItem label="Target Service"   value={content.routing?.targetService} />
            </div>
          </div>

          {rd.triggeredRules?.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-red-500 rounded" />Triggered Rules ({rd.triggeredRules.length})
              </h3>
              <div className="space-y-2">
                {rd.triggeredRules.map((rule, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-semibold text-gray-900 text-sm">{rule.ruleName || rule.ruleId}</span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        rule.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                        rule.severity === 'HIGH'     ? 'bg-red-100 text-red-700' :
                        rule.severity === 'MEDIUM'   ? 'bg-amber-100 text-amber-700' :
                                                       'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{rule.reasoning}</p>
                    <div className="text-xs text-gray-400">
                      Confidence: {(rule.confidence * 100).toFixed(0)}% &nbsp;|&nbsp; Score contribution: +{rule.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Blocked / suspicious log list
    if (content.type === 'blocked-list' || content.type === 'suspicious-list') {
      const isBlocked = content.type === 'blocked-list';
      const logs = content.logs || [];

      return (
        <div>
          <p className="text-sm text-gray-500 mb-4">{logs.length} matching request{logs.length !== 1 ? 's' : ''}</p>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {logs.map((log, i) => {
              const rd = log.riskDecision || log.aiDecision || {};
              return (
                <div key={i} className={`border rounded-lg p-3 ${isBlocked ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className={`text-xs font-bold ${isBlocked ? 'text-red-700' : 'text-amber-700'}`}>
                      Score: {rd.riskScore}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900">{log.request?.method} {log.request?.endpoint}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{rd.explanation}</div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Traffic pattern analysis
    if (content.title === 'Traffic Pattern Analysis') {
      const { topIPs, topEndpoints, topRules, totalLogs } = content.data;

      return (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">Analysis based on last {totalLogs} requests</p>

          {topRules?.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Most Triggered Rules</h4>
              <div className="space-y-1.5">
                {topRules.map(([rule, count], i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 rounded px-3 py-2">
                    <span className="text-sm text-gray-700">{rule}</span>
                    <span className="text-sm font-bold text-gray-900">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Top Source IPs</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">IP Address</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Requests</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Share</th>
                </tr>
              </thead>
              <tbody>
                {topIPs.map(([ip, count], i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-800">{ip}</td>
                    <td className="px-3 py-2 text-gray-700">{count}</td>
                    <td className="px-3 py-2 text-gray-500">{((count / totalLogs) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Most Accessed Endpoints</h4>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Endpoint</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Requests</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Share</th>
                </tr>
              </thead>
              <tbody>
                {topEndpoints.map(([ep, count], i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-gray-800">{ep}</td>
                    <td className="px-3 py-2 text-gray-700">{count}</td>
                    <td className="px-3 py-2 text-gray-500">{((count / totalLogs) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return <div className="text-gray-500 text-sm">No details available</div>;
  };

  const titleMap = {
    'blocked-list':           'Blocked Requests',
    'suspicious-list':        'Suspicious Requests',
    'Traffic Pattern Analysis':'Traffic Pattern Analysis'
  };
  const modalTitle = content.type
    ? (titleMap[content.type] || 'Details')
    : (content.title || 'Request Details');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-large max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-xl">
          <h2 className="text-lg font-bold text-gray-900">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6">{renderContent()}</div>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, mono }) => (
  <div>
    <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
    <div className={`text-sm text-gray-900 ${mono ? 'font-mono break-all' : ''}`}>{value ?? 'N/A'}</div>
  </div>
);

export default DetailModal;
