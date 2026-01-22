import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WelcomeModal from './components/WelcomeModal';
import DetailModal from './components/DetailModal';
import NotificationContainer from './components/NotificationContainer';
import HelpPanel from './components/HelpPanel';
import { useNotification } from './hooks/useNotification';
import { useMetrics } from './hooks/useMetrics';
import { useLogs } from './hooks/useLogs';

const API_BASE = 'http://localhost:4000';

function App() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [detailModal, setDetailModal] = useState({ show: false, content: null });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const { notifications, addNotification } = useNotification();
  const { metrics, refreshMetrics, resetMetrics: doResetMetrics } = useMetrics(API_BASE, autoRefresh);
  const { logs, refreshLogs, clearLogs: doClearLogs } = useLogs(API_BASE, autoRefresh, isPaused);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const closeWelcomeModal = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem('hasSeenWelcome', 'true');
    addNotification('success', 'Welcome!', "You're all set! Try sending a test request or running a demo scenario.");
  }, [addNotification]);

  const startTour = useCallback(() => {
    closeWelcomeModal();
    addNotification('info', 'Tour Started', 'Follow the highlighted areas to learn about SafeRoute AI features.');
  }, [closeWelcomeModal, addNotification]);

  const sendTestRequest = async (endpoint, body, method = 'POST') => {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${API_BASE}${endpoint}`, options);
      const data = await response.json();
      
      if (response.status === 403) {
        addNotification('error', 'Request Blocked', `AI detected high fraud risk (Score: ${data.riskScore})`);
        if (soundAlerts) playAlertSound();
      } else if (data.riskLevel === 'SUSPICIOUS') {
        addNotification('warning', 'Suspicious Activity', `Request flagged for monitoring (Score: ${data.riskScore})`);
      } else {
        addNotification('success', 'Request Successful', `Request processed normally (Score: ${data.riskScore})`);
      }
      
      await Promise.all([refreshMetrics(), refreshLogs()]);
      
      return { status: response.status, data };
    } catch (error) {
      addNotification('error', 'Request Failed', 'Could not connect to the gateway. Make sure all services are running.');
      return { status: 500, data: { error: error.message } };
    }
  };

  const playAlertSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const clearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      try {
        await fetch(`${API_BASE}/api/clear-logs`, { method: 'POST' });
        await doClearLogs();
        addNotification('success', 'Logs Cleared', 'All request logs have been cleared.');
      } catch {
        addNotification('error', 'Failed', 'Could not clear logs.');
      }
    }
  };

  const resetMetrics = async () => {
    if (window.confirm('Are you sure you want to reset all metrics? This will clear all statistics.')) {
      try {
        await fetch(`${API_BASE}/api/reset-metrics`, { method: 'POST' });
        await doResetMetrics();
        addNotification('success', 'Metrics Reset', 'All metrics have been reset to zero.');
      } catch {
        addNotification('error', 'Failed', 'Could not reset metrics on server.');
      }
    }
  };

  const exportData = async () => {
    try {
      const [metricsData, logsData] = await Promise.all([
        fetch(`${API_BASE}/metrics`).then(r => r.json()),
        fetch(`${API_BASE}/logs?limit=1000`).then(r => r.json())
      ]);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        metrics: metricsData,
        logs: logsData.logs
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `saferoute-export-${Date.now()}.json`;
      a.click();
      
      addNotification('success', 'Data Exported', 'All data has been exported successfully.');
    } catch {
      addNotification('error', 'Export Failed', 'Could not export data.');
    }
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        addNotification('success', 'Health Check', 'All services are running normally.');
      } else {
        addNotification('warning', 'Health Check', 'Some services may be experiencing issues.');
      }
    } catch {
      addNotification('error', 'Health Check Failed', 'Could not connect to the gateway.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        metrics={metrics}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleAutoRefresh={() => {
          setAutoRefresh(!autoRefresh);
          addNotification(
            autoRefresh ? 'info' : 'success',
            autoRefresh ? 'Auto-Refresh Disabled' : 'Auto-Refresh Enabled',
            autoRefresh ? 'Dashboard updates are paused.' : 'Dashboard will refresh every 2 seconds.'
          );
        }}
        onToggleSoundAlerts={() => {
          setSoundAlerts(!soundAlerts);
          addNotification(
            soundAlerts ? 'info' : 'success',
            soundAlerts ? 'Sound Alerts Disabled' : 'Sound Alerts Enabled',
            soundAlerts ? 'Sound notifications are now off.' : 'You will hear alerts for high-risk requests.'
          );
          if (!soundAlerts) playAlertSound();
        }}
        onClearLogs={clearLogs}
        onResetMetrics={resetMetrics}
        onExportData={exportData}
        autoRefresh={autoRefresh}
        soundAlerts={soundAlerts}
      />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobileMenu={() => setIsMobileMenuOpen(false)} 
          onSendRequest={sendTestRequest}
          onClearLogs={clearLogs}
          onResetMetrics={resetMetrics}
          onExportData={exportData}
          onHealthCheck={checkSystemHealth}
          addNotification={addNotification}
          soundAlerts={soundAlerts}
          apiBase={API_BASE}
          refreshDashboard={async () => {
            await Promise.all([refreshMetrics(), refreshLogs()]);
          }}
        />
        
        <Dashboard 
          metrics={metrics}
          logs={logs}
          isPaused={isPaused}
          onTogglePause={() => {
            setIsPaused(!isPaused);
            addNotification(
              'info',
              isPaused ? 'Logs Resumed' : 'Logs Paused',
              isPaused ? 'Live log updates have resumed.' : 'Live log updates are paused.'
            );
          }}
          onShowDetail={(content) => setDetailModal({ show: true, content })}
          addNotification={addNotification}
          apiBase={API_BASE}
        />
        </div>
      </div>

      {showWelcome && (
        <WelcomeModal 
          onClose={closeWelcomeModal}
          onStartTour={startTour}
        />
      )}

      {detailModal.show && (
        <DetailModal 
          content={detailModal.content}
          onClose={() => setDetailModal({ show: false, content: null })}
        />
      )}

      <NotificationContainer notifications={notifications} />
      <HelpPanel />
    </div>
  );
}

export default App;
