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

  const getSystemStatus = () => {
    if (!metrics) return { color: 'bg-red-500', text: 'System Error' };
    const isHealthy = metrics.requests.total > 0;
    return {
      color: isHealthy ? 'bg-green-500' : 'bg-yellow-500',
      text: isHealthy ? 'All Systems Operational' : 'Initializing...'
    };
  };

  const status = getSystemStatus();

  return (
    <header className="gradient-primary shadow-large sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex justify-between items-center">
        {/* Hamburger Menu - Mobile Only */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Logo Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-3xl sm:text-4xl lg:text-5xl animate-float drop-shadow-lg">🛡️</span>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white to-indigo-100 bg-clip-text text-transparent">
              SafeRoute AI
            </h1>
            <span className="text-white/70 text-xs sm:text-sm font-medium tracking-wide hidden sm:block">
              Intelligent API Gateway
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Status Indicator */}
          <div className="hidden md:flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse shadow-lg`}></div>
            <span className="text-white text-xs lg:text-sm font-medium hidden lg:block">{status.text}</span>
          </div>

          {/* Settings Dropdown */}
          <div className="relative">
            <button
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-white/20 transition-all duration-300"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="hidden sm:inline">⚙️ Settings</span>
              <span className="sm:hidden">⚙️</span>
            </button>
            
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)}
                ></div>
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-large w-64 z-50">
                  <MenuItem 
                    icon="🔄" 
                    title="Auto-Refresh" 
                    subtitle="Toggle automatic dashboard updates"
                    onClick={onToggleAutoRefresh}
                    active={autoRefresh}
                  />
                  <MenuItem 
                    icon="🔔" 
                    title="Sound Alerts" 
                    subtitle="Enable audio notifications"
                    onClick={onToggleSoundAlerts}
                    active={soundAlerts}
                  />
                  <MenuItem 
                    icon="🗑️" 
                    title="Clear Logs" 
                    subtitle="Remove all request logs"
                    onClick={() => { setShowDropdown(false); onClearLogs(); }}
                  />
                  <MenuItem 
                    icon="↺" 
                    title="Reset Metrics" 
                    subtitle="Clear all statistics"
                    onClick={() => { setShowDropdown(false); onResetMetrics(); }}
                  />
                  <MenuItem 
                    icon="📥" 
                    title="Export Data" 
                    subtitle="Download metrics and logs"
                    onClick={() => { setShowDropdown(false); onExportData(); }}
                    isLast
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

const MenuItem = ({ icon, title, subtitle, onClick, active, isLast }) => (
  <div
    className={`px-4 py-2.5 cursor-pointer transition-all duration-200 flex items-center gap-2 hover:bg-gray-50 hover:pl-5 ${!isLast ? 'border-b border-gray-200' : ''}`}
    onClick={onClick}
  >
    <span className="text-xl">{icon}</span>
    <div className="flex-1">
      <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
        {title}
        {active !== undefined && (
          <span className={`text-xs px-2 py-0.5 rounded ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {active ? 'ON' : 'OFF'}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  </div>
);

export default Header;
