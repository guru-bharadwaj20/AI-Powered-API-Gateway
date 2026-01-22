import React, { useState } from 'react';

const LogsSection = ({ logs, isPaused, onTogglePause, onShowDetail }) => {
  const [filter, setFilter] = useState('all');

  const getRiskIcon = (level) => {
    const icons = {
      NORMAL: '🟢',
      SUSPICIOUS: '🟡',
      HIGH_RISK: '🔴'
    };
    return icons[level] || '⚪';
  };

  const getRiskColor = (level) => {
    if (level === 'HIGH_RISK') return '#ef4444';
    if (level === 'SUSPICIOUS') return '#f59e0b';
    return '#10b981';
  };

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.aiDecision?.riskLevel === filter);

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">Live Request Stream</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Requests</option>
            <option value="NORMAL">Normal Only</option>
            <option value="SUSPICIOUS">Suspicious Only</option>
            <option value="HIGH_RISK">High Risk Only</option>
          </select>
          <button
            onClick={onTogglePause}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center gap-1.5"
          >
            <span>{isPaused ? '▶️' : '⏸️'}</span>
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-3 sm:p-4 max-h-[400px] lg:max-h-[500px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No Requests Yet' : 'No Matching Requests'}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Send a test request or run a demo scenario to see activity here.'
                : 'No requests match the current filter. Try changing the filter or send more requests.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.slice(0, 20).map((log, index) => {
              const statusClass = log.response?.statusCode >= 200 && log.response?.statusCode < 300 ? 'success' : 'blocked';
              const time = new Date(log.timestamp).toLocaleTimeString('en-US', { 
                hour12: true, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              });
              const riskColor = getRiskColor(log.aiDecision?.riskLevel);

              return (
                <div
                  key={index}
                  onClick={() => onShowDetail(log)}
                  className="border-l-4 border-primary bg-gray-50 hover:bg-gray-100 p-2 sm:p-3 rounded-lg cursor-pointer transition-colors duration-200"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">{time}</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                        {log.request?.method || 'POST'}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">
                        {log.request?.endpoint || '/api/payments'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        statusClass === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.response?.statusCode || 200}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span 
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ 
                        backgroundColor: `${riskColor}20`, 
                        color: riskColor,
                        border: `1px solid ${riskColor}40` 
                      }}
                    >
                      {getRiskIcon(log.aiDecision?.riskLevel)} Risk: {log.aiDecision?.riskScore || 0}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default LogsSection;
