import React from 'react';
import MetricsSection from './MetricsSection';
import RiskSection from './RiskSection';
import ChartsSection from './ChartsSection';
import LogsSection from './LogsSection';
import AnalysisSection from './AnalysisSection';

const Dashboard = ({ 
  metrics, 
  logs, 
  isPaused, 
  onTogglePause, 
  onShowDetail,
  addNotification,
  apiBase 
}) => {
  return (
    <main className="flex-1 space-y-4 lg:space-y-6 min-w-0">
      <MetricsSection metrics={metrics} />
      <RiskSection metrics={metrics} />
      <ChartsSection metrics={metrics} />
      <LogsSection 
        logs={logs} 
        isPaused={isPaused} 
        onTogglePause={onTogglePause}
        onShowDetail={onShowDetail}
      />
      <AnalysisSection 
        metrics={metrics} 
        logs={logs}
        addNotification={addNotification}
        onShowDetail={onShowDetail}
        apiBase={apiBase}
      />
    </main>
  );
};

export default Dashboard;
