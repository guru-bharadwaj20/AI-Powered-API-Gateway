import React from 'react';

const MetricsSection = ({ metrics }) => {
  const totalRequests = metrics?.requests?.total || 0;
  const successRate = totalRequests > 0 
    ? ((metrics.requests.success / totalRequests) * 100).toFixed(1)
    : 0;
  const blockedRate = totalRequests > 0
    ? ((metrics.requests.blocked / totalRequests) * 100).toFixed(1)
    : 0;

  const metricCards = [
    {
      icon: '📊',
      iconColor: 'text-blue-600',
      label: 'Total Requests',
      value: totalRequests.toLocaleString(),
      change: '—'
    },
    {
      icon: '✓',
      iconColor: 'text-green-600',
      label: 'Success',
      value: (metrics?.requests?.success || 0).toLocaleString(),
      change: `${successRate}%`,
      changeColor: 'text-green-600'
    },
    {
      icon: '⊗',
      iconColor: 'text-red-600',
      label: 'Blocked',
      value: (metrics?.requests?.blocked || 0).toLocaleString(),
      change: `${blockedRate}%`,
      changeColor: 'text-red-600'
    },
    {
      icon: '⚡',
      iconColor: 'text-yellow-600',
      label: 'Avg Response',
      value: `${metrics?.performance?.averageResponseTime || 0}ms`,
      change: '—'
    }
  ];

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Traffic Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metricCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow-soft p-3 sm:p-4 hover:shadow-medium transition-shadow duration-200">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className={`text-xl sm:text-2xl ${card.iconColor}`}>{card.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm text-gray-600 mb-0.5">{card.label}</div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 truncate">{card.value}</div>
                <div className={`text-xs sm:text-sm mt-0.5 ${card.changeColor || 'text-gray-500'}`}>
                  {card.change}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MetricsSection;
