import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const RULE_COLORS = {
  RAPID_FIRE:       { bg: 'rgba(239,68,68,0.8)',   border: 'rgb(239,68,68)' },
  PAYLOAD_ANOMALY:  { bg: 'rgba(245,158,11,0.8)',  border: 'rgb(245,158,11)' },
  TIME_BASED:       { bg: 'rgba(59,130,246,0.8)',  border: 'rgb(59,130,246)' },
  SEQUENTIAL:       { bg: 'rgba(16,185,129,0.8)',  border: 'rgb(16,185,129)' }
};

const RISK_COLORS = {
  NORMAL:    { bg: 'rgba(16,185,129,0.85)',  border: 'rgb(16,185,129)' },
  SUSPICIOUS:{ bg: 'rgba(245,158,11,0.85)', border: 'rgb(245,158,11)' },
  HIGH_RISK: { bg: 'rgba(239,68,68,0.85)',   border: 'rgb(239,68,68)' }
};

const RulesChart = ({ metrics }) => {
  const ref = useRef(null);
  const instance = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (instance.current) instance.current.destroy();

    const tr = metrics?.ai?.triggeredRules || {};

    instance.current = new Chart(ref.current.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Rapid Fire', 'Payload Anomaly', 'Time-Based', 'Sequential'],
        datasets: [{
          label: 'Triggers',
          data: [
            tr.RAPID_FIRE || 0,
            tr.PAYLOAD_ANOMALY || 0,
            tr.TIME_BASED || 0,
            tr.SEQUENTIAL_PATTERN || 0
          ],
          backgroundColor: Object.values(RULE_COLORS).map(c => c.bg),
          borderColor: Object.values(RULE_COLORS).map(c => c.border),
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} trigger${ctx.parsed.y !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#6b7280', font: { size: 11 } },
            grid: { color: '#f3f4f6' }
          },
          x: {
            ticks: { color: '#6b7280', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });

    return () => { if (instance.current) instance.current.destroy(); };
  }, [metrics]);

  return <canvas ref={ref} />;
};

const RiskDoughnut = ({ metrics }) => {
  const ref = useRef(null);
  const instance = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (instance.current) instance.current.destroy();

    const byLevel = metrics?.risk?.byLevel || {};
    const normal = byLevel.NORMAL || 0;
    const suspicious = byLevel.SUSPICIOUS || 0;
    const highRisk = byLevel.HIGH_RISK || 0;
    const total = normal + suspicious + highRisk;

    instance.current = new Chart(ref.current.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Normal', 'Suspicious', 'High Risk'],
        datasets: [{
          data: [normal, suspicious, highRisk],
          backgroundColor: [
            RISK_COLORS.NORMAL.bg,
            RISK_COLORS.SUSPICIOUS.bg,
            RISK_COLORS.HIGH_RISK.bg
          ],
          borderColor: [
            RISK_COLORS.NORMAL.border,
            RISK_COLORS.SUSPICIOUS.border,
            RISK_COLORS.HIGH_RISK.border
          ],
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#374151',
              font: { size: 11 },
              padding: 12,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.parsed} requests (${pct}%)`;
              }
            }
          }
        }
      }
    });

    return () => { if (instance.current) instance.current.destroy(); };
  }, [metrics]);

  return <canvas ref={ref} />;
};

const ChartsSection = ({ metrics }) => {
  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Detection Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Fraud Rules Chart */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <h3 className="text-sm font-semibold text-gray-700">Fraud Rules Triggered</h3>
          </div>
          <div style={{ height: '200px' }}>
            <RulesChart metrics={metrics} />
          </div>
        </div>

        {/* Risk Distribution Doughnut */}
        <div className="bg-white rounded-xl shadow-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <h3 className="text-sm font-semibold text-gray-700">Risk Level Distribution</h3>
          </div>
          <div style={{ height: '200px' }}>
            <RiskDoughnut metrics={metrics} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChartsSection;
