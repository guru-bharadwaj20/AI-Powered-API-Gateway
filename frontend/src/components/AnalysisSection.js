import React from 'react';

const AnalysisSection = ({ metrics, logs, addNotification, onShowDetail, apiBase }) => {
  const alerts = [];

  if (metrics && metrics.requests) {
    if (metrics.requests.blocked > 10) {
      alerts.push({
        type: 'critical',
        icon: '🔴',
        title: 'High Blocking Rate Detected',
        message: `${metrics.requests.blocked} requests have been blocked. This may indicate an ongoing attack or misconfigured rules.`,
        actions: ['View Blocked Requests', 'Adjust Rules', 'Generate Report']
      });
    }

    if (metrics.risk?.byLevel?.SUSPICIOUS > metrics.requests.total * 0.1) {
      alerts.push({
        type: 'warning',
        icon: '🟡',
        title: 'Elevated Suspicious Activity',
        message: `${metrics.risk.byLevel.SUSPICIOUS} suspicious requests detected (${((metrics.risk.byLevel.SUSPICIOUS / metrics.requests.total) * 100).toFixed(1)}% of total). Monitor closely for patterns.`,
        actions: ['View Suspicious Requests', 'Analyze Patterns']
      });
    }

    if (metrics.ai?.triggeredRules?.RAPID_FIRE > 5) {
      alerts.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Rapid Fire Pattern Detected',
        message: `Rapid fire detection triggered ${metrics.ai.triggeredRules.RAPID_FIRE} times. Consider implementing rate limiting.`,
        actions: ['Configure Rate Limiting', 'View Source IPs']
      });
    }
  }

  const handleAction = async (action) => {
    if (action === 'View Blocked Requests' || action === 'View Suspicious Requests') {
      addNotification('info', 'Coming Soon', 'This feature is being developed.');
    } else if (action === 'Analyze Patterns') {
      try {
        const response = await fetch(`${apiBase}/logs?limit=500`);
        const data = await response.json();
        
        const ipCounts = {};
        const endpointCounts = {};
        
        data.logs.forEach(log => {
          ipCounts[log.request?.ipAddress] = (ipCounts[log.request?.ipAddress] || 0) + 1;
          endpointCounts[log.request?.endpoint] = (endpointCounts[log.request?.endpoint] || 0) + 1;
        });
        
        const topIPs = Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topEndpoints = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        
        const analysisContent = {
          title: 'Traffic Pattern Analysis',
          data: { topIPs, topEndpoints, totalLogs: data.logs.length }
        };
        
        onShowDetail(analysisContent);
      } catch {
        addNotification('error', 'Analysis Failed', 'Could not analyze traffic patterns.');
      }
    } else {
      addNotification('info', 'Coming Soon', 'This feature is being developed.');
    }
  };

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">AI Analysis & Insights</h2>
      <div className="bg-white rounded-lg shadow-soft p-3 sm:p-4 lg:p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Systems Normal</h3>
            <p className="text-gray-500">
              No anomalies or threats detected. The AI is monitoring all traffic and will alert you to any suspicious patterns.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, index) => (
              <div 
                key={index}
                className={`border-l-4 p-3 sm:p-4 rounded-lg ${
                  alert.type === 'critical' ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="text-2xl sm:text-3xl flex-shrink-0">{alert.icon}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">{alert.title}</h4>
                    <p className="text-sm sm:text-base text-gray-700 mb-3">{alert.message}</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {alert.actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          onClick={() => handleAction(action)}
                          className="px-2.5 py-1.5 text-xs sm:text-sm bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AnalysisSection;
