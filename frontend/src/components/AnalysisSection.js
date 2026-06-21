import React from 'react';

const AnalysisSection = ({ metrics, logs, addNotification, onShowDetail, apiBase }) => {
  const alerts = [];

  if (metrics && metrics.requests) {
    if (metrics.requests.blocked > 10) {
      alerts.push({
        type: 'critical',
        icon: '🔴',
        title: 'High Blocking Rate Detected',
        message: `${metrics.requests.blocked} requests have been blocked. This may indicate an ongoing attack.`,
        actions: ['view-blocked', 'generate-report']
      });
    }

    const suspicious = metrics.risk?.byLevel?.SUSPICIOUS || 0;
    if (suspicious > metrics.requests.total * 0.1 && metrics.requests.total > 0) {
      alerts.push({
        type: 'warning',
        icon: '🟡',
        title: 'Elevated Suspicious Activity',
        message: `${suspicious} suspicious requests detected (${((suspicious / metrics.requests.total) * 100).toFixed(1)}% of total traffic).`,
        actions: ['view-suspicious', 'analyze-patterns']
      });
    }

    if ((metrics.ai?.triggeredRules?.RAPID_FIRE || 0) > 5) {
      alerts.push({
        type: 'warning',
        icon: '⚡',
        title: 'Rapid Fire Pattern Detected',
        message: `Rapid fire detection triggered ${metrics.ai.triggeredRules.RAPID_FIRE} times. Rate limiting is recommended.`,
        actions: ['view-blocked', 'analyze-patterns']
      });
    }

    if ((metrics.ai?.triggeredRules?.SEQUENTIAL_PATTERN || 0) > 3) {
      alerts.push({
        type: 'warning',
        icon: '🔁',
        title: 'Replay Attack Pattern Detected',
        message: `Sequential/replay attack pattern detected ${metrics.ai.triggeredRules.SEQUENTIAL_PATTERN} times.`,
        actions: ['view-blocked', 'generate-report']
      });
    }
  }

  const ACTION_LABELS = {
    'view-blocked':    'View Blocked Requests',
    'view-suspicious': 'View Suspicious Requests',
    'analyze-patterns':'Analyze Patterns',
    'generate-report': 'Generate Report'
  };

  const handleAction = async (actionKey) => {
    if (actionKey === 'view-blocked') {
      const blocked = logs.filter(l => l.aiDecision?.riskLevel === 'HIGH_RISK');
      if (blocked.length === 0) {
        addNotification('info', 'No Blocked Requests', 'There are no HIGH_RISK requests in the current log window.');
        return;
      }
      onShowDetail({ type: 'blocked-list', logs: blocked });

    } else if (actionKey === 'view-suspicious') {
      const suspicious = logs.filter(l => l.aiDecision?.riskLevel === 'SUSPICIOUS');
      if (suspicious.length === 0) {
        addNotification('info', 'No Suspicious Requests', 'There are no SUSPICIOUS requests in the current log window.');
        return;
      }
      onShowDetail({ type: 'suspicious-list', logs: suspicious });

    } else if (actionKey === 'analyze-patterns') {
      try {
        const response = await fetch(`${apiBase}/logs?limit=500`);
        const data = await response.json();

        const ipCounts = {};
        const endpointCounts = {};
        const ruleCounts = {};

        data.logs.forEach(log => {
          const ip = log.request?.ipAddress || 'unknown';
          const ep = log.request?.endpoint || 'unknown';
          ipCounts[ip] = (ipCounts[ip] || 0) + 1;
          endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
          (log.aiDecision?.triggeredRules || []).forEach(r => {
            ruleCounts[r.ruleName] = (ruleCounts[r.ruleName] || 0) + 1;
          });
        });

        const topIPs = Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topEndpoints = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const topRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);

        onShowDetail({
          title: 'Traffic Pattern Analysis',
          data: { topIPs, topEndpoints, topRules, totalLogs: data.logs.length }
        });
      } catch {
        addNotification('error', 'Analysis Failed', 'Could not fetch logs for analysis.');
      }

    } else if (actionKey === 'generate-report') {
      try {
        const [metricsData, logsData] = await Promise.all([
          fetch(`${apiBase}/metrics`).then(r => r.json()),
          fetch(`${apiBase}/logs?limit=1000`).then(r => r.json()),
          fetch(`${apiBase}/api/fraud-patterns`).then(r => r.json()).catch(() => ({ patterns: [] }))
        ]);

        const report = {
          generatedAt: new Date().toISOString(),
          summary: {
            totalRequests: metricsData.requests?.total || 0,
            blockedRequests: metricsData.requests?.blocked || 0,
            blockRate: metricsData.requests?.total > 0
              ? `${((metricsData.requests.blocked / metricsData.requests.total) * 100).toFixed(1)}%`
              : '0%',
            averageRiskScore: metricsData.risk?.averageScore || 0,
            uptime: `${metricsData.uptime}s`
          },
          riskBreakdown: metricsData.risk?.byLevel || {},
          triggeredRules: metricsData.ai?.triggeredRules || {},
          recentLogs: logsData.logs?.slice(0, 100) || []
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saferoute-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addNotification('success', 'Report Generated', 'Security report downloaded successfully.');
      } catch {
        addNotification('error', 'Report Failed', 'Could not generate the security report.');
      }
    }
  };

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">AI Analysis & Insights</h2>
      <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Systems Normal</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              No active threats detected. The AI engine is monitoring all traffic in real-time and will surface alerts if patterns change.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`border-l-4 p-4 rounded-lg ${
                  alert.type === 'critical' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{alert.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-gray-900 mb-1">{alert.title}</h4>
                    <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                    <div className="flex flex-wrap gap-2">
                      {alert.actions.map((key) => (
                        <button
                          key={key}
                          onClick={() => handleAction(key)}
                          className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200"
                        >
                          {ACTION_LABELS[key]}
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
