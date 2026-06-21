import React, { useState } from 'react';

const Header = ({
  metrics,
  onToggleMobileMenu,
  isMobileMenuOpen,
  onToggleAutoRefresh,
  onToggleSoundAlerts,
  onClearLogs,
  onResetMetrics,
  onExportData,
  autoRefresh,
  soundAlerts
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const totalRequests = metrics?.requests?.total || 0;
  const blockedCount  = metrics?.requests?.blocked || 0;
  const uptime        = metrics?.uptime || 0;

  const isHealthy = totalRequests > 0;

  const formatUptime = (s) => {
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  };

  return (
    <header className="gradient-primary shadow-large sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 flex justify-between items-center">

        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 hidden sm:flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">API Gateway</h1>
            <p className="text-white/70 text-xs hidden sm:block">Fraud Detection Dashboard</p>
          </div>
        </div>

        {/* Stats — desktop */}
        <div className="hidden lg:flex items-center gap-4">
          <Stat label="Requests" value={totalRequests.toLocaleString()} />
          <Stat label="Blocked" value={blockedCount.toLocaleString()} highlight={blockedCount > 0} />
          {uptime > 0 && <Stat label="Uptime" value={formatUptime(uptime)} />}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className="hidden md:flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></div>
            <span className="text-white/80 text-xs hidden lg:block">
              {isHealthy ? 'Operational' : 'Initializing'}
            </span>
          </div>

          {/* Auto-refresh toggle */}
          <button
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? 'Pause auto-refresh' : 'Enable auto-refresh'}
            className={`p-1.5 rounded-lg transition-colors ${autoRefresh ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'} hover:bg-white/25`}
          >
            <svg className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Settings dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="hidden sm:inline">Settings</span>
            </button>

            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-large w-60 z-50 overflow-hidden">
                  <DropdownItem
                    icon={autoRefresh ? '⏸' : '▶'}
                    label={autoRefresh ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}
                    hint={autoRefresh ? 'Currently refreshing every 2s' : 'Dashboard is paused'}
                    onClick={onToggleAutoRefresh}
                  />
                  <DropdownItem
                    icon={soundAlerts ? '🔇' : '🔔'}
                    label={soundAlerts ? 'Mute Alerts' : 'Enable Sound Alerts'}
                    hint="Audio on high-risk detections"
                    onClick={onToggleSoundAlerts}
                  />
                  <DropdownItem
                    icon="📥"
                    label="Export Data"
                    hint="Download metrics & logs as JSON"
                    onClick={() => { setShowDropdown(false); onExportData(); }}
                  />
                  <DropdownItem
                    icon="🗑"
                    label="Clear Logs"
                    hint="Remove all request logs"
                    onClick={() => { setShowDropdown(false); onClearLogs(); }}
                  />
                  <DropdownItem
                    icon="↺"
                    label="Reset Metrics"
                    hint="Zero out all statistics"
                    onClick={() => { setShowDropdown(false); onResetMetrics(); }}
                    last
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const Stat = ({ label, value, highlight }) => (
  <div className="text-center">
    <div className={`text-sm font-bold ${highlight ? 'text-red-300' : 'text-white'}`}>{value}</div>
    <div className="text-white/60 text-xs">{label}</div>
  </div>
);

const DropdownItem = ({ icon, label, hint, onClick, last }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${!last ? 'border-b border-gray-100' : ''}`}
  >
    <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
    <div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="text-xs text-gray-400">{hint}</div>
    </div>
  </button>
);

export default Header;
