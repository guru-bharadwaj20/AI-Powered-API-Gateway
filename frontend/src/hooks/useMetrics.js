import { useState, useEffect, useCallback } from 'react';

const initialMetrics = {
  requests: { total: 0, success: 0, blocked: 0, failed: 0 },
  risk: {
    byLevel: { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 },
    averageScore: 0
  },
  performance: { averageResponseTime: 0 },
  ai: {
    triggeredRules: {
      RAPID_FIRE: 0,
      PAYLOAD_ANOMALY: 0,
      TIME_BASED: 0,
      SEQUENTIAL_PATTERN: 0
    }
  },
  uptime: 0
};

export const useMetrics = (apiBase, autoRefresh) => {
  const [metrics, setMetrics] = useState(initialMetrics);

  const refreshMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/metrics`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, [apiBase]);

  const resetMetrics = useCallback(() => {
    setMetrics(initialMetrics);
  }, []);

  useEffect(() => {
    refreshMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(refreshMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [refreshMetrics, autoRefresh]);

  return { metrics, refreshMetrics, resetMetrics };
};
