import { useState, useEffect, useCallback } from 'react';

export const useLogs = (apiBase, autoRefresh, isPaused) => {
  const [logs, setLogs] = useState([]);

  const refreshLogs = useCallback(async () => {
    if (isPaused) return;
    
    try {
      const response = await fetch(`${apiBase}/logs?limit=50`);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [apiBase, isPaused]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    refreshLogs();
    
    if (autoRefresh && !isPaused) {
      const interval = setInterval(refreshLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [refreshLogs, autoRefresh, isPaused]);

  return { logs, refreshLogs, clearLogs };
};
