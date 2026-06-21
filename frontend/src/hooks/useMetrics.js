import { useState, useEffect, useCallback } from 'react';

const initialMetrics = {
  requests: { total: 0, success: 0, blocked: 0, failed: 0 },
  risk: {
    byLevel: { NORMAL: 0, SUSPICIOUS: 0, HIGH_RISK: 0 },
    averageScore: 0,
    histogram: {}
  },
  performance: { averageResponseTime: 0, latency: { p50: 0, p95: 0, p99: 0 } },
  fraud: {
    triggeredRules: {
      RAPID_FIRE: 0, PAYLOAD_ANOMALY: 0, TIME_BASED: 0,
      SEQUENTIAL_PATTERN: 0, CREDENTIAL_STUFFING: 0, BURST_TRANSFER: 0, VELOCITY_SPIKE: 0
    }
  },
  uptime: 0
};

export const useMetrics = (apiBase, autoRefresh) => {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [timeline, setTimeline] = useState([]);

  const refreshMetrics = useCallback(async () => {
    try {
      const resp = await fetch(`${apiBase}/metrics`);
      const data = await resp.json();
      // normalise: backend emits `fraud.triggeredRules`; fallback to legacy `ai.triggeredRules`
      if (!data.fraud && data.ai) data.fraud = data.ai;
      setMetrics(data);
    } catch {
      // keep stale state on network error
    }
  }, [apiBase]);

  const refreshTimeline = useCallback(async () => {
    try {
      const resp = await fetch(`${apiBase}/logs/timeline?minutes=15`);
      const data = await resp.json();
      if (Array.isArray(data)) setTimeline(data);
    } catch {}
  }, [apiBase]);

  const resetMetrics = useCallback(() => {
    setMetrics(initialMetrics);
    setTimeline([]);
  }, []);

  useEffect(() => {
    refreshMetrics();
    refreshTimeline();

    if (autoRefresh) {
      const m = setInterval(refreshMetrics, 2000);
      const t = setInterval(refreshTimeline, 5000);
      return () => { clearInterval(m); clearInterval(t); };
    }
  }, [refreshMetrics, refreshTimeline, autoRefresh]);

  return { metrics, timeline, refreshMetrics, resetMetrics };
};
