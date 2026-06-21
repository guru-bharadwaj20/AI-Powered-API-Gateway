import React, { useState } from 'react';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ScenarioButtons = ({ apiBase, addNotification, refreshDashboard, soundAlerts }) => {
  const [runningScenario, setRunningScenario] = useState(null);

  const post = async (body) => {
    try {
      await fetch(`${apiBase}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error('Scenario request failed:', err);
    }
  };

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const executeScenario = async (id) => {
    setRunningScenario(id);
    try {
      await run(id);
    } finally {
      await refreshDashboard();
      setRunningScenario(null);
    }
  };

  const run = async (id) => {
    switch (id) {
      case 'normal':
        addNotification('info', 'Running Scenario', 'Sending normal transaction...');
        await post({ userId: 'user_12345', amount: 350, currency: 'USD', recipient: 'merchant_789' });
        addNotification('success', 'Scenario Complete', 'Normal transaction processed successfully.');
        break;

      case 'rapid-fire':
        addNotification('info', 'Running Scenario', 'Simulating rapid fire attack — 25 requests...');
        for (let i = 0; i < 25; i++) {
          await post({ userId: 'attacker_rf', amount: 100, currency: 'USD', recipient: 'merchant_789' });
          await sleep(100); // fast enough to trigger RAPID_FIRE (>10 in 60s)
          if (i === 11) await refreshDashboard(); // mid-scenario refresh
        }
        addNotification('warning', 'Scenario Complete', 'Rapid fire attack detected and blocked by AI!');
        if (soundAlerts) playAlert();
        break;

      case 'high-value': {
        addNotification('info', 'Running Scenario', 'Building transaction history then sending outlier...');
        // Seed normal transactions so mean is well established
        for (let i = 0; i < 12; i++) {
          await post({ userId: 'user_hv', amount: 200 + Math.floor(Math.random() * 200), currency: 'USD', recipient: 'merchant_789' });
          await sleep(60);
        }
        // Now send the statistical outlier
        await post({ userId: 'user_hv', amount: 25000, currency: 'USD', recipient: 'merchant_789' });
        addNotification('warning', 'Scenario Complete', 'High-value anomaly flagged by statistical outlier detection.');
        break;
      }

      case 'off-hours':
        addNotification('info', 'Running Scenario', 'Simulating off-hours large transaction...');
        await post({ userId: 'user_night', amount: 8500, currency: 'USD', recipient: 'merchant_789' });
        addNotification('warning', 'Scenario Complete', 'Off-hours high-value transaction flagged for monitoring.');
        break;

      case 'combined':
        addNotification('info', 'Running Scenario', 'Triggering multiple fraud indicators simultaneously...');
        for (let i = 0; i < 22; i++) {
          await post({ userId: 'attacker_multi', amount: 15000, currency: 'USD', recipient: 'suspicious_acct' });
          await sleep(80);
          if (i === 10) await refreshDashboard();
        }
        addNotification('error', 'Scenario Complete', 'Critical threat! Rapid fire + high value + sequential patterns all detected.');
        if (soundAlerts) playAlert();
        break;

      default:
        break;
    }
  };

  const scenarios = [
    { id: 'normal',     icon: '🟢', title: 'Normal Transaction',   sub: 'Legitimate payment, low risk',           color: 'hover:border-emerald-500 hover:bg-emerald-50' },
    { id: 'rapid-fire', icon: '⚡', title: 'Rapid Fire Attack',    sub: '25 requests in quick succession',        color: 'hover:border-red-500 hover:bg-red-50' },
    { id: 'high-value', icon: '💰', title: 'High-Value Anomaly',   sub: 'Statistical outlier: 100× above avg',   color: 'hover:border-amber-500 hover:bg-amber-50' },
    { id: 'off-hours',  icon: '🌙', title: 'Off-Hours Activity',   sub: '$8,500 payment at unusual hours',        color: 'hover:border-amber-500 hover:bg-amber-50' },
    { id: 'combined',   icon: '🚨', title: 'Combined Threat',      sub: 'Rapid fire + high value + sequential',  color: 'hover:border-red-500 hover:bg-red-50' }
  ];

  return (
    <div className="space-y-2">
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => executeScenario(s.id)}
          disabled={runningScenario !== null}
          className={`w-full flex items-center gap-2.5 p-2.5 border-2 border-gray-200 rounded-lg ${s.color} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <span className="text-xl flex-shrink-0">{s.icon}</span>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-500 truncate">{s.sub}</div>
          </div>
          {runningScenario === s.id && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
          )}
        </button>
      ))}
    </div>
  );
};

export default ScenarioButtons;
