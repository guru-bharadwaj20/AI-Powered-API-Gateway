import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const ChartsSection = ({ metrics }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const triggeredRules = metrics?.ai?.triggeredRules || {};

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Rapid Fire', 'Payload Anomaly', 'Time-Based', 'Sequential'],
        datasets: [{
          label: 'Triggered Count',
          data: [
            triggeredRules.RAPID_FIRE || 0,
            triggeredRules.PAYLOAD_ANOMALY || 0,
            triggeredRules.TIME_BASED || 0,
            triggeredRules.SEQUENTIAL_PATTERN || 0
          ],
          backgroundColor: [
            'rgba(218, 30, 40, 0.7)',
            'rgba(241, 194, 27, 0.7)',
            'rgba(15, 98, 254, 0.7)',
            'rgba(36, 161, 72, 0.7)'
          ],
          borderColor: [
            'rgb(218, 30, 40)',
            'rgb(241, 194, 27)',
            'rgb(15, 98, 254)',
            'rgb(36, 161, 72)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Fraud Detection Rules Triggered',
            color: '#161616',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#525252' },
            grid: { color: '#e0e0e0' }
          },
          x: {
            ticks: { color: '#525252' },
            grid: { display: false }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [metrics]);

  return (
    <section>
      <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3">Fraud Detection Patterns</h2>
      <div className="bg-white rounded-lg shadow-soft p-3 sm:p-4 lg:p-6" style={{ height: '250px', maxHeight: '350px' }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </section>
  );
};

export default ChartsSection;
