import React from 'react';

const MetricsSection = ({ metrics }) => {
  const totalRequests = metrics?.requests?.total || 0;
  const successCount = metrics?.requests?.success || 0;
  const blockedCount = metrics?.requests?.blocked || 0;
  const avgResponse = metrics?.performance?.averageResponseTime || 0;
  const uptime = metrics?.uptime || 0;

  const successRate = totalRequests > 0 ? ((successCount / totalRequests) * 100).toFixed(1) : 0;
  const blockedRate = totalRequests > 0 ? ((blockedCount / totalRequests) * 100).toFixed(1) : 0;

  const formatUptime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const cards = [
    {
      gradient: 'from-blue-500 to-blue-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      label: 'Total Requests',
      value: totalRequests.toLocaleString(),
      sub: uptime > 0 ? `Uptime ${formatUptime(uptime)}` : 'Waiting for traffic...'
    },
    {
      gradient: 'from-emerald-500 to-emerald-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Successful',
      value: successCount.toLocaleString(),
      sub: `${successRate}% success rate`
    },
    {
      gradient: 'from-red-500 to-red-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      label: 'Blocked',
      value: blockedCount.toLocaleString(),
      sub: `${blockedRate}% block rate`
    },
    {
      gradient: 'from-violet-500 to-violet-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      label: 'Avg Response',
      value: `${avgResponse}ms`,
      sub: avgResponse < 100 ? 'Excellent latency' : avgResponse < 300 ? 'Good latency' : 'High latency'
    }
  ];

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Traffic Summary</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`bg-gradient-to-br ${card.gradient} rounded-xl p-4 text-white shadow-medium hover:shadow-large transition-shadow duration-200`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="bg-white/20 rounded-lg p-2">{card.icon}</div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold mb-1 truncate">{card.value}</div>
            <div className="text-white/90 text-xs sm:text-sm font-medium">{card.label}</div>
            <div className="text-white/70 text-xs mt-1 truncate">{card.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default MetricsSection;
