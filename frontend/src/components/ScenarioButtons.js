import React, { useState } from 'react';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const ScenarioButtons = ({ apiBase, addNotification, refreshDashboard, soundAlerts }) => {
  const [runningScenario, setRunningScenario] = useState(null);

  const sendScenarioRequest = async (body) => {
    try {
      await fetch(`${apiBase}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      await refreshDashboard();
    } catch (error) {
      console.error('Scenario request failed:', error);
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

  const executeScenario = async (scenario) => {
    setRunningScenario(scenario);

    const scenarios = {
      normal: async () => {
        addNotification('info', 'Running Scenario', 'Sending normal transaction...');
        await sendScenarioRequest({
          userId: 'user_12345',
          amount: 500,
          currency: 'USD',
          recipient: 'merchant_789'
        });
        addNotification('success', 'Scenario Complete', 'Normal transaction processed successfully.');
      },
      'rapid-fire': async () => {
        addNotification('info', 'Running Scenario', 'Simulating rapid fire attack (30 requests)...');
        
        for (let i = 0; i < 30; i++) {
          await sendScenarioRequest({
            userId: 'attacker_123',
            amount: 1000,
            currency: 'USD',
            recipient: 'merchant_789'
          });
          await sleep(2000);
        }
        
        addNotification('warning', 'Scenario Complete', 'Rapid fire attack detected and blocked by AI!');
        if (soundAlerts) playAlertSound();
      },
      'high-value': async () => {
        addNotification('info', 'Running Scenario', 'Sending high-value transaction...');
        await sendScenarioRequest({
          userId: 'user_12345',
          amount: 15000,
          currency: 'USD',
          recipient: 'merchant_789'
        });
        addNotification('warning', 'Scenario Complete', 'High-value anomaly detected by AI.');
      },
      'off-hours': async () => {
        addNotification('info', 'Running Scenario', 'Simulating off-hours activity...');
        await sendScenarioRequest({
          userId: 'user_12345',
          amount: 5000,
          currency: 'USD',
          recipient: 'merchant_789'
        });
        addNotification('warning', 'Scenario Complete', 'Off-hours activity flagged for monitoring.');
      },
      combined: async () => {
        addNotification('info', 'Running Scenario', 'Triggering multiple fraud indicators...');
        
        for (let i = 0; i < 25; i++) {
          await sendScenarioRequest({
            userId: 'attacker_456',
            amount: 12000,
            currency: 'USD',
            recipient: 'merchant_789'
          });
          await sleep(2000);
        }
        
        addNotification('error', 'Scenario Complete', 'Critical threat detected! Multiple fraud indicators triggered.');
        if (soundAlerts) playAlertSound();
      }
    };

    if (scenarios[scenario]) {
      await scenarios[scenario]();
    }
    
    setRunningScenario(null);
  };

  const scenarios = [
    { id: 'normal', icon: '🟢', title: 'Normal Transaction', subtitle: 'Typical payment, low risk' },
    { id: 'rapid-fire', icon: '🔴', title: 'Rapid Fire Attack', subtitle: '30 requests in 60 seconds' },
    { id: 'high-value', icon: '🟡', title: 'High-Value Anomaly', subtitle: 'Payment 10x above average' },
    { id: 'off-hours', icon: '🟡', title: 'Off-Hours Activity', subtitle: 'Large payment at 2 AM' },
    { id: 'combined', icon: '🔴', title: 'Combined Threat', subtitle: 'Multiple fraud indicators' }
  ];

  return (
    <div className="space-y-2">
      {scenarios.map((scenario) => (
        <button
          key={scenario.id}
          onClick={() => executeScenario(scenario.id)}
          disabled={runningScenario !== null}
          className="w-full flex items-start gap-2 p-2.5 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-xl flex-shrink-0">{scenario.icon}</span>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-gray-900">{scenario.title}</div>
            <div className="text-xs text-gray-500">{scenario.subtitle}</div>
          </div>
          {runningScenario === scenario.id && (
            <span className="text-primary animate-spin">⏳</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default ScenarioButtons;
