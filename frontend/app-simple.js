
let autoRefreshInterval = null;
let isPaused = false;
let fraudPatternsChart = null;
let previousMetrics = null;
let soundAlertsEnabled = false;

const API_BASE = 'http://localhost:3000';

const requestBodyTemplates = {
    '/api/payments': {
        userId: 'user_12345',
        amount: 500,
        currency: 'USD',
        recipient: 'merchant_789',
        description: 'Test payment transaction'
    },
    '/api/accounts/:accountId': {},
    '/api/payments/:transactionId': {},
    '/api/verify/identity': {
        userId: 'user_12345',
        documentType: 'passport',
        documentNumber: 'AB123456'
    }
};

function init() {
    setupEventListeners();
    updateRequestBodyTemplate();
    startAutoRefresh();
    showWelcomeModal();
    initializeCharts();
    checkSystemHealth();
}

function setupEventListeners() {
    document.getElementById('closeWelcomeBtn').addEventListener('click', closeWelcomeModal);
    document.getElementById('startTourBtn').addEventListener('click', startTour);
    document.getElementById('refreshBtn').addEventListener('click', refreshDashboard);
    document.getElementById('sendRequestBtn').addEventListener('click', sendTestRequest);
    document.getElementById('endpointSelect').addEventListener('change', updateRequestBodyTemplate);
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    document.getElementById('resetMetricsBtn').addEventListener('click', resetMetrics);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('pauseLogsBtn').addEventListener('click', togglePauseLogs);
    document.getElementById('autoRefreshToggle').addEventListener('change', toggleAutoRefresh);
    document.getElementById('soundAlertsToggle').addEventListener('change', toggleSoundAlerts);
    document.getElementById('helpToggle').addEventListener('click', toggleHelp);
    document.getElementById('closeHelp').addEventListener('click', closeHelp);
    document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);

    document.querySelectorAll('.btn-scenario').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scenario = e.currentTarget.dataset.scenario;
            executeScenario(scenario);
        });
    });
    
    document.addEventListener('click', (e) => {
        if (e.target.matches('.analysis-actions button')) {
            handleAnalysisAction(e.target.textContent);
        }
    });
}

function handleAnalysisAction(action) {
    switch(action) {
        case 'View Blocked Requests':
            viewBlockedRequests();
            break;
        case 'View Suspicious Requests':
            viewSuspiciousRequests();
            break;
        case 'Adjust Rules':
            adjustRules();
            break;
        case 'Generate Report':
            generateReport();
            break;
        case 'Analyze Patterns':
            analyzePatterns();
            break;
    }
}

async function viewBlockedRequests() {
    try {
        const response = await fetch(`${API_BASE}/logs?limit=100`);
        const data = await response.json();
        const blockedLogs = data.logs.filter(log => 
            log.aiDecision.recommendation === 'BLOCK_AND_VERIFY' || 
            log.response.statusCode === 403
        );
        
        showDetailModal('Blocked Requests', `
            <p>Found ${blockedLogs.length} blocked requests</p>
            <div class="log-list">
                ${blockedLogs.slice(0, 10).map(log => `
                    <div class="log-item">
                        <strong>${log.correlationId}</strong><br>
                        Risk Score: ${log.aiDecision.riskScore}<br>
                        Reason: ${log.aiDecision.explanation}
                    </div>
                `).join('')}
            </div>
        `);
    } catch (error) {
        showNotification('error', 'Failed', 'Could not load blocked requests.');
    }
}

async function viewSuspiciousRequests() {
    try {
        const response = await fetch(`${API_BASE}/logs?limit=100`);
        const data = await response.json();
        const suspiciousLogs = data.logs.filter(log => 
            log.aiDecision.riskLevel === 'SUSPICIOUS'
        );
        
        showDetailModal('Suspicious Requests', `
            <p>Found ${suspiciousLogs.length} suspicious requests</p>
            <div class="log-list">
                ${suspiciousLogs.slice(0, 10).map(log => `
                    <div class="log-item">
                        <strong>${log.correlationId}</strong><br>
                        Risk Score: ${log.aiDecision.riskScore}<br>
                        Reason: ${log.aiDecision.explanation}
                    </div>
                `).join('')}
            </div>
        `);
    } catch (error) {
        showNotification('error', 'Failed', 'Could not load suspicious requests.');
    }
}

function adjustRules() {
    showDetailModal('Adjust Detection Rules', `
        <p>Configure fraud detection thresholds:</p>
        <div class="rule-config">
            <label>Rapid Fire Threshold (requests/min):
                <input type="number" id="rapidFireThreshold" value="20" min="5" max="100">
            </label>
            <label>Rapid Fire Weight:
                <input type="range" id="rapidFireWeight" value="30" min="10" max="50">
                <span id="rapidFireWeightValue">30</span>
            </label>
            <label>Payload Anomaly Threshold:
                <input type="number" id="payloadThreshold" value="10000" min="1000" max="50000">
            </label>
            <label>Payload Weight:
                <input type="range" id="payloadWeight" value="25" min="10" max="50">
                <span id="payloadWeightValue">25</span>
            </label>
            <label>Time-based Weight:
                <input type="range" id="timeWeight" value="15" min="5" max="30">
                <span id="timeWeightValue">15</span>
            </label>
        </div>
        <div class="modal-actions">
            <button onclick="saveRuleAdjustments()" class="btn btn-primary">Save Changes</button>
            <button onclick="resetRulesToDefault()" class="btn btn-secondary">Reset to Default</button>
        </div>
    `);
    
    document.getElementById('rapidFireWeight').addEventListener('input', (e) => {
        document.getElementById('rapidFireWeightValue').textContent = e.target.value;
    });
    document.getElementById('payloadWeight').addEventListener('input', (e) => {
        document.getElementById('payloadWeightValue').textContent = e.target.value;
    });
    document.getElementById('timeWeight').addEventListener('input', (e) => {
        document.getElementById('timeWeightValue').textContent = e.target.value;
    });
}

function saveRuleAdjustments() {
    const rapidFireThreshold = document.getElementById('rapidFireThreshold').value;
    const rapidFireWeight = document.getElementById('rapidFireWeight').value;
    const payloadThreshold = document.getElementById('payloadThreshold').value;
    const payloadWeight = document.getElementById('payloadWeight').value;
    const timeWeight = document.getElementById('timeWeight').value;
    
    localStorage.setItem('ruleConfig', JSON.stringify({
        rapidFire: { threshold: rapidFireThreshold, weight: rapidFireWeight },
        payload: { threshold: payloadThreshold, weight: payloadWeight },
        time: { weight: timeWeight }
    }));
    
    closeDetailModal();
    showNotification('success', 'Rules Updated', 'Fraud detection rules have been adjusted successfully.');
}

function resetRulesToDefault() {
    localStorage.removeItem('ruleConfig');
    closeDetailModal();
    showNotification('success', 'Rules Reset', 'All rules have been reset to default values.');
}

async function generateReport() {
    try {
        showNotification('info', 'Generating Report', 'Creating comprehensive security report...');
        
        const [metrics, logs] = await Promise.all([
            fetch(`${API_BASE}/metrics`).then(r => r.json()),
            fetch(`${API_BASE}/logs?limit=1000`).then(r => r.json())
        ]);
        
        const blockedRequests = logs.logs.filter(log => log.response.statusCode === 403);
        const suspiciousRequests = logs.logs.filter(log => log.aiDecision.riskLevel === 'SUSPICIOUS');
        const highRiskRequests = logs.logs.filter(log => log.aiDecision.riskLevel === 'HIGH_RISK');
        
        const topTriggeredRules = Object.entries(metrics.ai.triggeredRules)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        const report = {
            generatedAt: new Date().toISOString(),
            summary: {
                totalRequests: metrics.totalRequests,
                blockedRequests: blockedRequests.length,
                suspiciousRequests: suspiciousRequests.length,
                highRiskRequests: highRiskRequests.length,
                averageRiskScore: metrics.ai.averageRiskScore
            },
            topRules: topTriggeredRules.map(([rule, count]) => ({ rule, count })),
            recentBlocked: blockedRequests.slice(0, 5).map(log => ({
                correlationId: log.correlationId,
                timestamp: log.timestamp,
                riskScore: log.aiDecision.riskScore,
                explanation: log.aiDecision.explanation
            }))
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-report-${Date.now()}.json`;
        a.click();
        
        showNotification('success', 'Report Generated', 'Security report has been downloaded.');
    } catch (error) {
        showNotification('error', 'Report Failed', 'Could not generate security report.');
    }
}

function analyzePatterns() {
    showDetailModal('Pattern Analysis', `
        <p>Analyzing fraud patterns across all requests...</p>
        <div class="pattern-analysis">
            <h4>Common Patterns Detected:</h4>
            <ul>
                <li>Rapid fire attacks from single IPs</li>
                <li>High-value transactions during off-hours</li>
                <li>Sequential payment attempts</li>
                <li>Unusual payload sizes</li>
            </ul>
            <h4>Recommendations:</h4>
            <ul>
                <li>Increase monitoring for off-hours activity</li>
                <li>Implement stricter rate limiting</li>
                <li>Review high-value transaction thresholds</li>
            </ul>
        </div>
    `);
}

function showDetailModal(title, content) {
    const modal = document.getElementById('detailModal');
    document.getElementById('detailModalTitle').textContent = title;
    document.getElementById('detailModalBody').innerHTML = content;
    modal.style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function showWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'flex';
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').style.display = 'none';
}

function startTour() {
    closeWelcomeModal();
    showNotification('info', 'Tour Started', 'Welcome! Let me show you around SafeRoute AI...');
}

function toggleHelp() {
    const helpContent = document.getElementById('helpContent');
    helpContent.classList.toggle('show');
}

function closeHelp() {
    document.getElementById('helpContent').classList.remove('show');
}

function initializeCharts() {
    const ctx = document.getElementById('fraudPatternsChart');
    if (ctx) {
        fraudPatternsChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Rapid Fire', 'Payload Anomaly', 'Time-based', 'Sequential'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

async function checkSystemHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const statusDot = document.getElementById('statusDot');
        const systemStatus = document.getElementById('systemStatus');
        
        if (data.status === 'healthy') {
            statusDot.className = 'status-dot online';
            systemStatus.textContent = 'All Systems Operational';
        } else {
            statusDot.className = 'status-dot offline';
            systemStatus.textContent = 'System Issues Detected';
        }
    } catch (error) {
        const statusDot = document.getElementById('statusDot');
        const systemStatus = document.getElementById('systemStatus');
        statusDot.className = 'status-dot offline';
        systemStatus.textContent = 'Connection Error';
    }
}

function startAutoRefresh() {
    autoRefreshInterval = setInterval(() => {
        if (!isPaused) {
            refreshDashboard();
        }
    }, 5000);
}

function toggleAutoRefresh(e) {
    if (e.target.checked) {
        startAutoRefresh();
        showNotification('info', 'Auto-refresh Enabled', 'Dashboard will update every 5 seconds.');
    } else {
        clearInterval(autoRefreshInterval);
        showNotification('info', 'Auto-refresh Disabled', 'Dashboard updates paused.');
    }
}

function togglePauseLogs() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseLogsBtn');
    btn.innerHTML = isPaused ? '<span class="icon">▶️</span> Resume' : '<span class="icon">⏸️</span> Pause';
    showNotification('info', isPaused ? 'Logs Paused' : 'Logs Resumed', 
        isPaused ? 'Log updates are paused.' : 'Log updates have resumed.');
}

function toggleSoundAlerts(e) {
    soundAlertsEnabled = e.target.checked;
    showNotification('info', soundAlertsEnabled ? 'Sound Alerts Enabled' : 'Sound Alerts Disabled',
        soundAlertsEnabled ? 'You will hear alerts for high-risk events.' : 'Sound alerts are now muted.');
}

function playAlertSound() {
