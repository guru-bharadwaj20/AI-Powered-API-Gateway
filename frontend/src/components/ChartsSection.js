import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const RULE_LABELS = [
  'Rapid Fire', 'Payload Anomaly', 'Time-Based', 'Sequential',
  'Cred. Stuffing', 'Burst Transfer', 'Velocity Spike'
];
const RULE_KEYS = [
  'RAPID_FIRE', 'PAYLOAD_ANOMALY', 'TIME_BASED', 'SEQUENTIAL_PATTERN',
  'CREDENTIAL_STUFFING', 'BURST_TRANSFER', 'VELOCITY_SPIKE'
];
const RULE_BG = [
  'rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)',
  'rgba(139,92,246,0.8)', 'rgba(236,72,153,0.8)', 'rgba(249,115,22,0.8)'
];
const RULE_BORDER = [
  'rgb(239,68,68)', 'rgb(245,158,11)', 'rgb(59,130,246)', 'rgb(16,185,129)',
  'rgb(139,92,246)', 'rgb(236,72,153)', 'rgb(249,115,22)'
];

function useChart(ref, factory, deps) {
  const instance = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    if (instance.current) instance.current.destroy();
    instance.current = factory(ref.current.getContext('2d'));
    return () => { if (instance.current) { instance.current.destroy(); instance.current = null; } };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── 1. Fraud Rules Bar Chart ─────────────────────────────────────────────────

const RulesChart = ({ metrics }) => {
  const ref = useRef(null);
  const tr = metrics?.fraud?.triggeredRules || {};
  const data = RULE_KEYS.map(k => tr[k] || 0);

  useChart(ref, (ctx) => new Chart(ctx, {
    type: 'bar',
    data: {
      labels: RULE_LABELS,
      datasets: [{
        label: 'Triggers',
        data,
        backgroundColor: RULE_BG,
        borderColor:     RULE_BORDER,
        borderWidth:  2,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} trigger${ctx.parsed.y !== 1 ? 's' : ''}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280', font: { size: 10 } }, grid: { color: '#f3f4f6' } },
        x: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { display: false } }
      }
    }
  }), [JSON.stringify(data)]);

  return <canvas ref={ref} />;
};

// ── 2. Risk Level Doughnut ───────────────────────────────────────────────────

const RiskDoughnut = ({ metrics }) => {
  const ref = useRef(null);
  const byLevel = metrics?.risk?.byLevel || {};
  const normal = byLevel.NORMAL || 0;
  const suspicious = byLevel.SUSPICIOUS || 0;
  const highRisk = byLevel.HIGH_RISK || 0;
  const total = normal + suspicious + highRisk;

  useChart(ref, (ctx) => new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Normal', 'Suspicious', 'High Risk'],
      datasets: [{
        data: [normal, suspicious, highRisk],
        backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(245,158,11,0.85)', 'rgba(239,68,68,0.85)'],
        borderColor:     ['rgb(16,185,129)', 'rgb(245,158,11)', 'rgb(239,68,68)'],
        borderWidth: 2, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#374151', font: { size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } },
        tooltip: { callbacks: { label: ctx => { const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0; return ` ${ctx.parsed} (${pct}%)`; } } }
      }
    }
  }), [normal, suspicious, highRisk]);

  return <canvas ref={ref} />;
};

// ── 3. Timeline Line Chart ───────────────────────────────────────────────────

const TimelineChart = ({ timeline }) => {
  const ref = useRef(null);
  const labels  = timeline.map(b => b.minute);
  const normal  = timeline.map(b => b.normal);
  const susp    = timeline.map(b => b.suspicious);
  const high    = timeline.map(b => b.highRisk);

  const mkDs = (label, data, color) => ({
    label, data,
    borderColor: color, backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
    borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: 0.3, fill: true
  });

  useChart(ref, (ctx) => new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        mkDs('Normal',     normal, 'rgb(16,185,129)'),
        mkDs('Suspicious', susp,   'rgb(245,158,11)'),
        mkDs('High Risk',  high,   'rgb(239,68,68)')
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { color: '#374151', font: { size: 11 }, padding: 10, usePointStyle: true, pointStyleWidth: 8 } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280', font: { size: 10 } }, grid: { color: '#f3f4f6' } },
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } }
      }
    }
  }), [JSON.stringify(labels), JSON.stringify(normal), JSON.stringify(susp), JSON.stringify(high)]);

  return <canvas ref={ref} />;
};

// ── 4. Risk Score Histogram ──────────────────────────────────────────────────

const HistogramChart = ({ metrics }) => {
  const ref = useRef(null);
  const histogram = metrics?.risk?.histogram || {};
  const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  const labels  = buckets.map(b => `${b}-${b + 9}`);
  const data    = buckets.map(b => histogram[b] || 0);
  const colors  = buckets.map(b =>
    b >= 70 ? 'rgba(239,68,68,0.8)' : b >= 31 ? 'rgba(245,158,11,0.8)' : 'rgba(16,185,129,0.8)'
  );

  useChart(ref, (ctx) => new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Requests',
        data, backgroundColor: colors, borderWidth: 0, borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} request${ctx.parsed.y !== 1 ? 's' : ''}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#6b7280', font: { size: 10 } }, grid: { color: '#f3f4f6' } },
        x: { ticks: { color: '#6b7280', font: { size: 9 } }, grid: { display: false } }
      }
    }
  }), [JSON.stringify(data)]);

  return <canvas ref={ref} />;
};

// ── Wrapper ──────────────────────────────────────────────────────────────────

const Dot = ({ color }) => (
  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
);

const ChartCard = ({ dot, title, height = '200px', children }) => (
  <div className="bg-white rounded-xl shadow-soft p-4">
    <div className="flex items-center gap-2 mb-3">
      <Dot color={dot} />
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
    </div>
    <div style={{ height }}>{children}</div>
  </div>
);

const ChartsSection = ({ metrics, timeline }) => (
  <section>
    <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Detection Analytics</h2>

    {/* Row 1 — timeline + histogram */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
      <ChartCard dot="#3b82f6" title="Traffic Timeline (15 min)" height="200px">
        <TimelineChart timeline={timeline || []} />
      </ChartCard>
      <ChartCard dot="#8b5cf6" title="Risk Score Histogram" height="200px">
        <HistogramChart metrics={metrics} />
      </ChartCard>
    </div>

    {/* Row 2 — rules + doughnut */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <ChartCard dot="#ef4444" title="Fraud Rules Triggered (all 7 rules)" height="200px">
        <RulesChart metrics={metrics} />
      </ChartCard>
      <ChartCard dot="#10b981" title="Risk Level Distribution" height="200px">
        <RiskDoughnut metrics={metrics} />
      </ChartCard>
    </div>
  </section>
);

export default ChartsSection;
