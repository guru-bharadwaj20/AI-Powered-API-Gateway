import React from 'react';

const AnalysisSection = ({ metrics, logs, addNotification, onShowDetail, apiBase }) => {
  const alerts = [];
  const fraudRules = metrics?.fraud?.triggeredRules || metrics?.ai?.triggeredRules || {};

  if (metrics?.requests) {
    if (metrics.requests.blocked > 10) {
      alerts.push({
        type: 'critical',
        title: 'High Blocking Rate',
        message: `${metrics.requests.blocked} requests blocked — possible ongoing attack.`,
        actions: ['view-blocked', 'generate-report']
      });
    }

    const suspicious = metrics.risk?.byLevel?.SUSPICIOUS || 0;
    if (suspicious > metrics.requests.total * 0.1 && metrics.requests.total > 0) {
      alerts.push({
        type: 'warning',
        title: 'Elevated Suspicious Activity',
        message: `${suspicious} suspicious requests (${((suspicious / metrics.requests.total) * 100).toFixed(1)}% of traffic).`,
        actions: ['view-suspicious', 'analyze-patterns']
      });
    }

    if ((fraudRules.RAPID_FIRE || 0) > 5) {
      alerts.push({
        type: 'warning',
        title: 'Rapid Fire Pattern',
        message: `RAPID_FIRE rule triggered ${fraudRules.RAPID_FIRE} times. Rate limiting is active.`,
        actions: ['view-blocked', 'analyze-patterns']
      });
    }

    if ((fraudRules.CREDENTIAL_STUFFING || 0) > 3) {
      alerts.push({
        type: 'critical',
        title: 'Credential Stuffing Detected',
        message: `${fraudRules.CREDENTIAL_STUFFING} credential stuffing signals — multiple distinct user IDs from single IPs.`,
        actions: ['view-blocked', 'generate-report']
      });
    }

    if ((fraudRules.SEQUENTIAL_PATTERN || 0) > 3) {
      alerts.push({
        type: 'warning',
        title: 'Replay Attack Pattern',
        message: `Identical payload reuse detected ${fraudRules.SEQUENTIAL_PATTERN} times.`,
        actions: ['view-blocked', 'generate-report']
      });
    }

    if ((fraudRules.BURST_TRANSFER || 0) > 3) {
      alerts.push({
        type: 'warning',
        title: 'Burst Transfer Pattern',
        message: `${fraudRules.BURST_TRANSFER} burst-transfer signals — rapid payments to same recipient.`,
        actions: ['view-suspicious', 'analyze-patterns']
      });
    }
  }

  const ACTION_LABELS = {
    'view-blocked':    'View Blocked',
    'view-suspicious': 'View Suspicious',
    'analyze-patterns':'Analyze Patterns',
    'generate-report': 'Download Report'
  };

  const handleAction = async (actionKey) => {
    if (actionKey === 'view-blocked') {
      const blocked = logs.filter(l => (l.riskDecision?.riskLevel || l.aiDecision?.riskLevel) === 'HIGH_RISK');
      if (!blocked.length) { addNotification('info', 'No Blocked Requests', 'No HIGH_RISK requests in current window.'); return; }
      onShowDetail({ type: 'blocked-list', logs: blocked });

    } else if (actionKey === 'view-suspicious') {
      const susp = logs.filter(l => (l.riskDecision?.riskLevel || l.aiDecision?.riskLevel) === 'SUSPICIOUS');
      if (!susp.length) { addNotification('info', 'No Suspicious Requests', 'No SUSPICIOUS requests in current window.'); return; }
      onShowDetail({ type: 'suspicious-list', logs: susp });

    } else if (actionKey === 'analyze-patterns') {
      try {
        const data = await fetch(`${apiBase}/logs?limit=500`).then(r => r.json());
        const ipCounts = {}, endpointCounts = {}, ruleCounts = {};
        data.logs.forEach(log => {
          const ip = log.request?.ipAddress || 'unknown';
          const ep = log.request?.endpoint  || 'unknown';
          ipCounts[ip]       = (ipCounts[ip]       || 0) + 1;
          endpointCounts[ep] = (endpointCounts[ep] || 0) + 1;
          const rd = log.riskDecision || log.aiDecision || {};
          (rd.triggeredRules || []).forEach(r => { ruleCounts[r.ruleName || r.ruleId] = (ruleCounts[r.ruleName || r.ruleId] || 0) + 1; });
        });
        onShowDetail({
          title: 'Traffic Pattern Analysis',
          data: {
            topIPs:       Object.entries(ipCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topEndpoints: Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]).slice(0, 5),
            topRules:     Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]),
            totalLogs:    data.logs.length
          }
        });
      } catch { addNotification('error', 'Analysis Failed', 'Could not fetch logs.'); }

    } else if (actionKey === 'generate-report') {
      try {
        const [metricsData, logsData] = await Promise.all([
          fetch(`${apiBase}/metrics`).then(r => r.json()),
          fetch(`${apiBase}/logs?limit=1000`).then(r => r.json())
        ]);
        const report = {
          generatedAt: new Date().toISOString(),
          summary: {
            totalRequests:   metricsData.requests?.total    || 0,
            blockedRequests: metricsData.requests?.blocked  || 0,
            blockRate:       metricsData.requests?.total > 0
              ? `${((metricsData.requests.blocked / metricsData.requests.total) * 100).toFixed(1)}%` : '0%',
            averageRiskScore: metricsData.risk?.averageScore || 0,
            uptime: `${metricsData.uptime}s`
          },
          riskBreakdown:  metricsData.risk?.byLevel       || {},
          triggeredRules: metricsData.fraud?.triggeredRules || {},
          latency:        metricsData.performance?.latency  || {},
          recentLogs:     logsData.logs?.slice(0, 100)     || []
        };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `security-report-${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        addNotification('success', 'Report Downloaded', 'Security report saved as JSON.');
      } catch { addNotification('error', 'Report Failed', 'Could not generate report.'); }
    }
  };

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Risk Analysis & Insights</h2>
      <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Systems Normal</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              No active threats detected. The fraud detection engine is monitoring all traffic and will surface alerts when patterns change.
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.type === 'critical' ? 'bg-red-100' : 'bg-amber-100'
                  }`}>
                    {alert.type === 'critical'
                      ? <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                      : <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-gray-900 mb-1">{alert.title}</h4>
                    <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                    <div className="flex flex-wrap gap-2">
                      {alert.actions.map((key) => (
                        <button
                          key={key}
                          onClick={() => handleAction(key)}
                          className="px-3 py-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
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
