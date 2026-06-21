import React from 'react';

const RiskSection = ({ metrics }) => {
  const total = metrics?.requests?.total || 0;
  const byLevel = metrics?.risk?.byLevel || {};
  const normal = byLevel.NORMAL || 0;
  const suspicious = byLevel.SUSPICIOUS || 0;
  const highRisk = byLevel.HIGH_RISK || 0;
  const avgScore = metrics?.risk?.averageScore || 0;
  const blocked = metrics?.requests?.blocked || 0;
  const failed = metrics?.requests?.failed || 0;

  const pct = (n) => total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 31) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 70) return 'High Risk Level';
    if (score >= 31) return 'Medium Risk Level';
    return 'Low Risk Level';
  };

  const bars = [
    { label: 'Normal',    count: normal,    pct: pct(normal),    color: 'bg-emerald-500', textColor: 'text-emerald-700' },
    { label: 'Suspicious',count: suspicious, pct: pct(suspicious),color: 'bg-amber-500',   textColor: 'text-amber-700'   },
    { label: 'High Risk', count: highRisk,   pct: pct(highRisk),  color: 'bg-red-500',     textColor: 'text-red-700'     }
  ];

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Risk Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Risk breakdown bars */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Traffic Risk Breakdown</h3>
          <div className="space-y-3">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700">{b.label}</span>
                  <span className={`text-sm font-bold ${b.textColor}`}>
                    {b.count.toLocaleString()} <span className="font-normal text-gray-400 text-xs">({b.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${b.color} rounded-full transition-all duration-500`}
                    style={{ width: `${b.pct}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Score + stats */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">Session Statistics</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 text-center py-2 border border-gray-100 rounded-lg">
              <div className={`text-3xl font-extrabold ${getScoreColor(avgScore)}`}>{avgScore.toFixed(1)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Average Risk Score</div>
              <div className={`text-xs font-medium mt-0.5 ${getScoreColor(avgScore)}`}>{getScoreLabel(avgScore)}</div>
            </div>
            <StatItem label="Total Analyzed" value={total.toLocaleString()} />
            <StatItem label="Blocked" value={blocked.toLocaleString()} highlight={blocked > 0} />
            <StatItem label="Failed" value={failed.toLocaleString()} highlight={failed > 0} />
            <StatItem label="Allowed" value={(total - blocked - failed).toLocaleString()} />
          </div>
        </div>
      </div>
    </section>
  );
};

const StatItem = ({ label, value, highlight }) => (
  <div className="text-center p-2 bg-gray-50 rounded-lg">
    <div className={`text-lg font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

export default RiskSection;
