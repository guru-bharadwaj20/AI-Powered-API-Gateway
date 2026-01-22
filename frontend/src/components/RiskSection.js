import React from 'react';

const RiskSection = ({ metrics }) => {
  const total = metrics?.requests?.total || 1;
  const normalCount = metrics?.risk?.byLevel?.NORMAL || 0;
  const suspiciousCount = metrics?.risk?.byLevel?.SUSPICIOUS || 0;
  const highRiskCount = metrics?.risk?.byLevel?.HIGH_RISK || 0;
  const avgRiskScore = metrics?.risk?.averageScore || 0;

  const normalPercent = ((normalCount / total) * 100).toFixed(1);
  const suspiciousPercent = ((suspiciousCount / total) * 100).toFixed(1);
  const highRiskPercent = ((highRiskCount / total) * 100).toFixed(1);

  const getRiskLevel = (score) => {
    if (score < 30) return 'Low Risk';
    if (score < 70) return 'Medium Risk';
    return 'High Risk';
  };

  const riskCards = [
    {
      icon: '🟢',
      label: 'Normal',
      count: normalCount,
      percent: normalPercent,
      color: 'border-green-500',
      barColor: 'bg-green-500'
    },
    {
      icon: '🟡',
      label: 'Suspicious',
      count: suspiciousCount,
      percent: suspiciousPercent,
      color: 'border-yellow-500',
      barColor: 'bg-yellow-500'
    },
    {
      icon: '🔴',
      label: 'High Risk',
      count: highRiskCount,
      percent: highRiskPercent,
      color: 'border-red-500',
      barColor: 'bg-red-500'
    },
    {
      icon: '📈',
      label: 'Avg Risk Score',
      count: avgRiskScore.toFixed(1),
      percent: getRiskLevel(avgRiskScore),
      color: 'border-blue-500',
      barColor: null
    }
  ];

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Risk Distribution</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {riskCards.map((card, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-lg shadow-soft p-3 sm:p-4 border-l-4 ${card.color}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base sm:text-lg">{card.icon}</span>
              <span className="text-xs sm:text-sm font-medium text-gray-600 truncate">{card.label}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5 truncate">{card.count}</div>
            <div className="text-xs sm:text-sm text-gray-500 mb-2">{card.percent}</div>
            {card.barColor && (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${card.barColor} transition-all duration-300`}
                  style={{ width: `${card.percent}%` }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default RiskSection;
