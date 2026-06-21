import React, { useState } from 'react';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const ScenarioButtons = ({ apiBase, addNotification, refreshDashboard, soundAlerts }) => {
  const [runningScenario, setRunningScenario] = useState(null);

  const post = async (endpoint, body) => {
    try {
      await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error('Scenario request failed:', err);
    }
  };

  const pay = (body) => post('/api/payments', body);
  const verify = (body) => post('/api/verify/identity', body);

  const playAlert = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const execute = async (id) => {
    setRunningScenario(id);
    try { await run(id); }
    finally { await refreshDashboard(); setRunningScenario(null); }
  };

  const run = async (id) => {
    switch (id) {

      case 'normal':
        addNotification('info', 'Running', 'Sending a legitimate transaction...');
        await pay({ userId: 'user_12345', amount: 350, currency: 'USD', recipient: 'merchant_789' });
        addNotification('success', 'Complete', 'Normal transaction processed — risk score should be low.');
        break;

      case 'rapid-fire':
        addNotification('info', 'Running', 'Rapid fire attack: 25 requests at 100ms intervals...');
        for (let i = 0; i < 25; i++) {
          await pay({ userId: 'attacker_rf', amount: 100, currency: 'USD', recipient: 'merchant_789' });
          await sleep(100);
          if (i === 12) await refreshDashboard();
        }
        addNotification('warning', 'Complete', 'RAPID_FIRE rule triggered and requests blocked.');
        if (soundAlerts) playAlert();
        break;

      case 'high-value': {
        addNotification('info', 'Running', 'Building baseline then sending statistical outlier...');
        for (let i = 0; i < 14; i++) {
          await pay({ userId: 'user_hv', amount: 200 + Math.floor(Math.random() * 250), currency: 'USD', recipient: 'merchant_789' });
          await sleep(60);
        }
        await pay({ userId: 'user_hv', amount: 28000, currency: 'USD', recipient: 'merchant_789' });
        addNotification('warning', 'Complete', 'PAYLOAD_ANOMALY triggered — amount is far above the rolling mean.');
        break;
      }

      case 'credential-stuffing':
        addNotification('info', 'Running', 'Credential stuffing: 8 different user IDs from same IP...');
        for (let i = 1; i <= 8; i++) {
          await verify({ userId: `victim_user_${i}`, documentType: 'passport', documentNumber: `DOC${i}000` });
          await sleep(200);
        }
        addNotification('warning', 'Complete', 'CREDENTIAL_STUFFING rule triggered — multiple account enumeration signals.');
        if (soundAlerts) playAlert();
        break;

      case 'replay-attack':
        addNotification('info', 'Running', 'Replay attack: same payload submitted 8 times...');
        for (let i = 0; i < 8; i++) {
          await pay({ userId: 'attacker_replay', amount: 999, currency: 'USD', recipient: 'money_mule' });
          await sleep(300);
        }
        addNotification('warning', 'Complete', 'SEQUENTIAL_PATTERN triggered — identical payload hash reuse detected.');
        if (soundAlerts) playAlert();
        break;

      case 'burst-transfer':
        addNotification('info', 'Running', 'Burst transfer: rapid payments to same recipient...');
        for (let i = 0; i < 6; i++) {
          await pay({ userId: 'user_burst', amount: 1500, currency: 'USD', recipient: 'suspicious_acct_001' });
          await sleep(150);
        }
        addNotification('warning', 'Complete', 'BURST_TRANSFER rule triggered — structured payment pattern detected.');
        break;

      case 'combined':
        addNotification('info', 'Running', 'Combined threat: rapid fire + high value + sequential pattern...');
        for (let i = 0; i < 22; i++) {
          await pay({ userId: 'attacker_multi', amount: 12000, currency: 'USD', recipient: 'money_mule_acct' });
          await sleep(80);
          if (i === 10) await refreshDashboard();
        }
        addNotification('error', 'CRITICAL THREAT', 'Multiple rules fired: RAPID_FIRE + PAYLOAD_ANOMALY + SEQUENTIAL_PATTERN.');
        if (soundAlerts) playAlert();
        break;

      default: break;
    }
  };

  const scenarios = [
    { id: 'normal',              title: 'Normal Transaction',     sub: 'Legitimate payment — low risk',               color: 'hover:border-emerald-500 hover:bg-emerald-50' },
    { id: 'rapid-fire',          title: 'Rapid Fire Attack',      sub: '25 requests at 100ms — triggers RAPID_FIRE',  color: 'hover:border-red-500 hover:bg-red-50' },
    { id: 'high-value',          title: 'High-Value Anomaly',     sub: 'Statistical outlier via z-score detection',   color: 'hover:border-amber-500 hover:bg-amber-50' },
    { id: 'credential-stuffing', title: 'Credential Stuffing',    sub: '8 distinct user IDs from single IP',          color: 'hover:border-violet-500 hover:bg-violet-50' },
    { id: 'replay-attack',       title: 'Replay Attack',          sub: 'Same payload 8× — triggers SEQUENTIAL_PATTERN', color: 'hover:border-blue-500 hover:bg-blue-50' },
    { id: 'burst-transfer',      title: 'Burst Transfer',         sub: 'Rapid payments to same recipient',            color: 'hover:border-pink-500 hover:bg-pink-50' },
    { id: 'combined',            title: 'Combined Threat',        sub: 'Rapid fire + high value + sequential',        color: 'hover:border-red-600 hover:bg-red-50' }
  ];

  return (
    <div className="space-y-2">
      {scenarios.map((s) => (
        <button
          key={s.id}
          onClick={() => execute(s.id)}
          disabled={runningScenario !== null}
          className={`w-full flex items-center gap-2.5 p-2.5 border-2 border-gray-200 rounded-lg ${s.color} transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="text-xs text-gray-500 truncate">{s.sub}</div>
          </div>
          {runningScenario === s.id && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ScenarioButtons;
