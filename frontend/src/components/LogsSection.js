import React, { useState } from 'react';

const RISK = {
  NORMAL:    { icon: '🟢', color: '#10b981', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  SUSPICIOUS:{ icon: '🟡', color: '#f59e0b', cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
  HIGH_RISK: { icon: '🔴', color: '#ef4444', cls: 'bg-red-50 text-red-700 border-red-200'            }
};

const LogsSection = ({ logs, isPaused, onTogglePause, onShowDetail }) => {
  const [filter, setFilter] = useState('all');

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
            className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="all">All</option>
            <option value="NORMAL">Normal</option>
            <option value="SUSPICIOUS">Suspicious</option>
            <option value="HIGH_RISK">High Risk</option>
          </select>
          <button
            onClick={onTogglePause}
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center gap-1.5"
          >
            {isPaused ? (
              <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>Resume</>
            ) : (
              <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"/></svg>Pause</>
            )}
          </button>
          {isPaused && (
            <span className="px-2 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-lg font-medium">PAUSED</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-soft p-3 sm:p-4 max-h-[440px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">📭</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {filter === 'all' ? 'No Requests Yet' : 'No Matching Requests'}
            </h3>
            <p className="text-gray-400 text-sm">
              {filter === 'all'
                ? 'Send a test request or run a demo scenario to start monitoring traffic.'
                : 'Try a different filter or send more requests.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredLogs.slice(0, 30).map((log, i) => {
              const risk = RISK[log.aiDecision?.riskLevel] || RISK.NORMAL;
              const isBlocked = log.routing?.routingDecision === 'BLOCKED';
              const statusCode = log.response?.statusCode;
              const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
              });

              return (
                <div
                  key={i}
                  onClick={() => onShowDetail(log)}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-150 border border-transparent hover:border-gray-200"
                >
                  {/* Risk indicator */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: risk.color, minHeight: '32px' }}
                  ></div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-xs text-gray-400 font-mono">{time}</span>
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">
                        {log.request?.method}
                      </span>
                      <span className="text-xs font-medium text-gray-800 truncate max-w-[200px]">
                        {log.request?.endpoint}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                        statusCode >= 200 && statusCode < 300
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {statusCode}
                      </span>
                      {isBlocked && (
                        <span className="px-1.5 py-0.5 text-xs font-semibold rounded bg-red-600 text-white">
                          BLOCKED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${risk.cls}`}>
                        {risk.icon} {log.aiDecision?.riskLevel?.replace('_', ' ')} · {log.aiDecision?.riskScore}
                      </span>
                      {log.routing?.targetService && (
                        <span className="text-xs text-gray-400">→ {log.routing.targetService}</span>
                      )}
                      {log.response?.responseTime && (
                        <span className="text-xs text-gray-400">{log.response.responseTime}ms</span>
                      )}
                    </div>
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
