import React, { useState, useEffect, useCallback } from 'react';

const SERVICES = [
  { name: 'API Gateway',    url: 'http://localhost:4000/health', port: 4000, color: 'violet' },
  { name: 'Payment Svc',   url: 'http://localhost:3001/health', port: 3001, color: 'blue'   },
  { name: 'Account Svc',   url: 'http://localhost:3002/health', port: 3002, color: 'emerald'},
  { name: 'Verify Svc',    url: 'http://localhost:3003/health', port: 3003, color: 'amber'  }
];

const STATUS = { ok: 'ok', down: 'down', checking: 'checking' };

const colorMap = {
  violet:  { dot: 'bg-violet-500',  badge: 'bg-violet-50 border-violet-200 text-violet-700'  },
  blue:    { dot: 'bg-blue-500',    badge: 'bg-blue-50 border-blue-200 text-blue-700'         },
  emerald: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700'},
  amber:   { dot: 'bg-amber-500',   badge: 'bg-amber-50 border-amber-200 text-amber-700'      }
};

const ServiceStatus = () => {
  const [statuses, setStatuses] = useState(
    SERVICES.reduce((acc, s) => ({ ...acc, [s.name]: STATUS.checking }), {})
  );

  const checkAll = useCallback(async () => {
    const results = await Promise.allSettled(
      SERVICES.map(s =>
        fetch(s.url, { signal: AbortSignal.timeout(3000) })
          .then(r => r.ok ? STATUS.ok : STATUS.down)
          .catch(() => STATUS.down)
      )
    );
    setStatuses(
      SERVICES.reduce((acc, s, i) => ({
        ...acc,
        [s.name]: results[i].value ?? STATUS.down
      }), {})
    );
  }, []);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, 10000);
    return () => clearInterval(interval);
  }, [checkAll]);

  const allOk = SERVICES.every(s => statuses[s.name] === STATUS.ok);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900">Service Health</h2>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full animate-pulse ${allOk ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
          <span className={`text-xs font-medium ${allOk ? 'text-emerald-600' : 'text-red-600'}`}>
            {allOk ? 'All Operational' : 'Degraded'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SERVICES.map(service => {
          const status = statuses[service.name];
          const colors = colorMap[service.color];
          const isOk = status === STATUS.ok;
          const isChecking = status === STATUS.checking;

          return (
            <div
              key={service.name}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isOk
                  ? colors.badge
                  : isChecking
                    ? 'bg-gray-50 border-gray-200 text-gray-600'
                    : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-3 h-3 rounded-full ${
                  isOk ? colors.dot : isChecking ? 'bg-gray-400' : 'bg-red-500'
                } ${isOk ? 'animate-pulse' : ''}`}></div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{service.name}</div>
                <div className="text-xs opacity-70">
                  {isChecking ? 'Checking...' : isOk ? `Port ${service.port}` : 'Offline'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ServiceStatus;
