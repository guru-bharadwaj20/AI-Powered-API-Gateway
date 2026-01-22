import React from 'react';
import TestPanel from './TestPanel';
import ScenarioButtons from './ScenarioButtons';

const Sidebar = ({ 
  onSendRequest, 
  onClearLogs, 
  onResetMetrics, 
  onExportData, 
  onHealthCheck,
  addNotification,
  soundAlerts,
  apiBase,
  refreshDashboard,
  isMobileMenuOpen,
  onCloseMobileMenu
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={onCloseMobileMenu}
        ></div>
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-80 lg:w-72 xl:w-80 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-white lg:bg-transparent
        overflow-y-auto
        pt-16 lg:pt-0
      `}>
      <div className="space-y-4 p-4 lg:p-0">
        {/* Test Panel */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Test API Gateway</h3>
          <TestPanel onSendRequest={onSendRequest} />
        </div>

        {/* Demo Scenarios */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Demo Scenarios</h3>
          <ScenarioButtons 
            apiBase={apiBase} 
            addNotification={addNotification}
            refreshDashboard={refreshDashboard}
            soundAlerts={soundAlerts}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <ActionButton icon="🗑️" text="Clear Logs" onClick={onClearLogs} />
            <ActionButton icon="↺" text="Reset Metrics" onClick={onResetMetrics} />
            <ActionButton icon="📥" text="Export Data" onClick={onExportData} />
            <ActionButton icon="❤️" text="Health Check" onClick={onHealthCheck} />
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

const ActionButton = ({ icon, text, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 font-medium"
  >
    <span className="text-lg">{icon}</span>
    <span>{text}</span>
  </button>
);

export default Sidebar;
