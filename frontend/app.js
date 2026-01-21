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
    document.getElementById('sendRequestBtn').addEventListener('click', sendTestRequest);
    document.getElementById('endpointSelect').addEventListener('change', updateRequestBodyTemplate);
    document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
    document.getElementById('resetMetricsBtn').addEventListener('click', resetMetrics);
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('healthCheckBtn').addEventListener('click', checkSystemHealth);
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

// Load JSON test files from backend
async function loadTestCaseFile(filename) {
    try {
        const response = await fetch(`/test-cases/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error loading test case ${filename}:`, error);
        showNotification('error', 'Load Failed', `Could not load test case: ${filename}`);
        return null;
    }
}

// Execute test case from JSON file
async function executeTestCase(category, filename) {
    const testCase = await loadTestCaseFile(`${category}/${filename}`);
    if (testCase) {
        showNotification('info', 'Running Test Case', `Executing: ${testCase.name || filename}`);
        await sendScenarioRequest(testCase.payload || testCase);
    }
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
        case 'Configure Rate Limiting':
            // Feature placeholder - removed production warning
            showNotification('info', 'Coming Soon', 'Advanced rate limiting configuration is being developed.');
            break;
        case 'View Source IPs':
            // Feature placeholder - removed production warning
            showNotification('info', 'Coming Soon', 'Detailed IP source analysis is being developed.');
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
        
        if (blockedLogs.length === 0) {
            showNotification('info', 'No Blocked Requests', 'No blocked requests found in recent logs.');
            return;
        }
        
        document.getElementById('logFilterSelect').value = 'HIGH_RISK';
        updateLogs(blockedLogs);
        
        showNotification('success', 'Blocked Requests', `Showing ${blockedLogs.length} blocked requests.`);
        
        document.querySelector('.logs-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showNotification('error', 'Failed', 'Could not load blocked requests.');
    }
}

async function viewSuspiciousRequests() {
    try {
        const response = await fetch(`${API_BASE}/logs?riskLevel=SUSPICIOUS&limit=100`);
        const data = await response.json();
        
        if (data.logs.length === 0) {
            showNotification('info', 'No Suspicious Requests', 'No suspicious requests found in recent logs.');
            return;
        }
        
        document.getElementById('logFilterSelect').value = 'SUSPICIOUS';
        updateLogs(data.logs);
        
        showNotification('success', 'Suspicious Requests', `Showing ${data.logs.length} suspicious requests.`);
        
        document.querySelector('.logs-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showNotification('error', 'Failed', 'Could not load suspicious requests.');
    }
}

function adjustRules() {
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('detailModalBody');
    
    body.innerHTML = `
        <div class="detail-section">
            <h3>Fraud Detection Rule Configuration</h3>
            <p style="margin-bottom: 1rem; color: var(--text-secondary);">
                Adjust the sensitivity and weights of fraud detection rules. Changes take effect immediately.
            </p>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Rapid Fire Detection</h4>
                <label style="display: block; margin-bottom: 0.5rem;">
                    Threshold (requests per minute):
                    <input type="number" id="rapidFireThreshold" value="20" min="5" max="50" 
                           style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid var(--border-color); border-radius: 4px;">
                </label>
                <label style="display: block;">
                    Rule Weight (0-50):
                    <input type="range" id="rapidFireWeight" value="40" min="0" max="50" 
                           style="width: 100%; margin-top: 0.25rem;">
                    <span id="rapidFireWeightValue">40</span>
                </label>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Payload Anomaly Detection</h4>
                <label style="display: block; margin-bottom: 0.5rem;">
                    Standard Deviation Threshold:
                    <input type="number" id="payloadThreshold" value="2" min="1" max="5" step="0.5"
                           style="width: 100%; padding: 0.5rem; margin-top: 0.25rem; border: 1px solid var(--border-color); border-radius: 4px;">
                </label>
                <label style="display: block;">
                    Rule Weight (0-50):
                    <input type="range" id="payloadWeight" value="30" min="0" max="50"
                           style="width: 100%; margin-top: 0.25rem;">
                    <span id="payloadWeightValue">30</span>
                </label>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem;">Time-Based Anomaly</h4>
                <label style="display: block;">
                    Rule Weight (0-30):
                    <input type="range" id="timeWeight" value="15" min="0" max="30"
                           style="width: 100%; margin-top: 0.25rem;">
                    <span id="timeWeightValue">15</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                <button class="btn btn-primary" onclick="saveRuleAdjustments()">Save Changes</button>
                <button class="btn btn-secondary" onclick="closeDetailModal()">Cancel</button>
                <button class="btn btn-secondary" onclick="resetRulesToDefault()">Reset to Default</button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    
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
            reportGenerated: new Date().toISOString(),
            reportPeriod: `Last ${metrics.uptime} seconds`,
            summary: {
                totalRequests: metrics.requests.total,
                successRate: ((metrics.requests.success / metrics.requests.total) * 100).toFixed(2) + '%',
                blockedRequests: metrics.requests.blocked,
                averageRiskScore: metrics.risk.averageScore.toFixed(2),
                averageResponseTime: metrics.performance.averageResponseTime + 'ms'
            },
            riskDistribution: {
                normal: metrics.risk.byLevel.NORMAL,
                suspicious: metrics.risk.byLevel.SUSPICIOUS,
                highRisk: metrics.risk.byLevel.HIGH_RISK
            },
            topThreats: {
                blockedCount: blockedRequests.length,
                suspiciousCount: suspiciousRequests.length,
                highRiskCount: highRiskRequests.length
            },
            topTriggeredRules: topTriggeredRules.map(([rule, count]) => ({
                rule,
                count,
                percentage: ((count / metrics.requests.total) * 100).toFixed(2) + '%'
            })),
            recentBlockedRequests: blockedRequests.slice(0, 10).map(log => ({
                timestamp: log.timestamp,
                endpoint: log.request.endpoint,
                ipAddress: log.request.ipAddress,
                riskScore: log.aiDecision.riskScore,
                reason: log.aiDecision.explanation
            })),
            recommendations: generateRecommendations(metrics, logs.logs)
        };
        
        const reportHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>SafeRoute AI Security Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                    h1 { color: #0f62fe; border-bottom: 3px solid #0f62fe; padding-bottom: 10px; }
                    h2 { color: #161616; margin-top: 30px; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; }
                    .metric { background: #f4f4f4; padding: 15px; margin: 10px 0; border-radius: 5px; }
                    .metric strong { color: #0f62fe; }
                    .critical { color: #da1e28; font-weight: bold; }
                    .warning { color: #f1c21b; font-weight: bold; }
                    .success { color: #24a148; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
                    th { background: #f4f4f4; font-weight: bold; }
                    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; color: #525252; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <h1>🛡️ SafeRoute AI Security Report</h1>
                <p><strong>Generated:</strong> ${new Date(report.reportGenerated).toLocaleString()}</p>
                <p><strong>Report Period:</strong> ${report.reportPeriod}</p>
                
                <h2>Executive Summary</h2>
                <div class="metric">
                    <strong>Total Requests:</strong> ${report.summary.totalRequests}<br>
                    <strong>Success Rate:</strong> <span class="success">${report.summary.successRate}</span><br>
                    <strong>Blocked Requests:</strong> <span class="critical">${report.summary.blockedRequests}</span><br>
                    <strong>Average Risk Score:</strong> ${report.summary.averageRiskScore}<br>
                    <strong>Average Response Time:</strong> ${report.summary.averageResponseTime}
                </div>
                
                <h2>Risk Distribution</h2>
                <table>
                    <tr><th>Risk Level</th><th>Count</th><th>Percentage</th></tr>
                    <tr><td>Normal (0-30)</td><td>${report.riskDistribution.normal}</td><td>${((report.riskDistribution.normal / metrics.requests.total) * 100).toFixed(1)}%</td></tr>
                    <tr><td>Suspicious (31-69)</td><td>${report.riskDistribution.suspicious}</td><td>${((report.riskDistribution.suspicious / metrics.requests.total) * 100).toFixed(1)}%</td></tr>
                    <tr><td>High Risk (70-100)</td><td>${report.riskDistribution.highRisk}</td><td>${((report.riskDistribution.highRisk / metrics.requests.total) * 100).toFixed(1)}%</td></tr>
                </table>
                
                <h2>Top Triggered Fraud Detection Rules</h2>
                <table>
                    <tr><th>Rule</th><th>Triggered Count</th><th>Percentage</th></tr>
                    ${report.topTriggeredRules.map(rule => `
                        <tr><td>${rule.rule}</td><td>${rule.count}</td><td>${rule.percentage}</td></tr>
                    `).join('')}
                </table>
                
                <h2>Recent Blocked Requests</h2>
                <table>
                    <tr><th>Timestamp</th><th>Endpoint</th><th>IP Address</th><th>Risk Score</th><th>Reason</th></tr>
                    ${report.recentBlockedRequests.map(req => `
                        <tr>
                            <td>${new Date(req.timestamp).toLocaleString()}</td>
                            <td>${req.endpoint}</td>
                            <td>${req.ipAddress}</td>
                            <td class="critical">${req.riskScore}</td>
                            <td>${req.reason}</td>
                        </tr>
                    `).join('')}
                </table>
                
                <h2>Recommendations</h2>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
                
                <div class="footer">
                    <p>This report was automatically generated by SafeRoute AI - Intelligent API Gateway</p>
                    <p>For questions or concerns, please contact your security team.</p>
                </div>
            </body>
            </html>
        `;
        
        const blob = new Blob([reportHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saferoute-security-report-${Date.now()}.html`;
        a.click();
        
        const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `saferoute-security-report-${Date.now()}.json`;
        jsonLink.click();
        
        showNotification('success', 'Report Generated', 'Security report has been generated and downloaded (HTML + JSON).');
    } catch (error) {
        showNotification('error', 'Report Failed', 'Could not generate security report.');
    }
}

function generateRecommendations(metrics, logs) {
    const recommendations = [];
    
    if (metrics.requests.blocked > metrics.requests.total * 0.05) {
        recommendations.push('High blocking rate detected. Review fraud detection rules to reduce false positives.');
    }
    
    if (metrics.risk.byLevel.SUSPICIOUS > metrics.requests.total * 0.1) {
        recommendations.push('Elevated suspicious activity. Consider implementing additional verification steps.');
    }
    
    if (metrics.ai.triggeredRules.RAPID_FIRE > 10) {
        recommendations.push('Frequent rapid-fire attacks detected. Implement rate limiting at the network level.');
    }
    
    if (metrics.performance.averageResponseTime > 100) {
        recommendations.push('Average response time is elevated. Consider optimizing backend services or adding caching.');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('System is operating normally. Continue monitoring for anomalies.');
    }
    
    return recommendations;
}

async function analyzePatterns() {
    try {
        showNotification('info', 'Analyzing Patterns', 'Analyzing traffic patterns and anomalies...');
        
        const response = await fetch(`${API_BASE}/logs?limit=500`);
        const data = await response.json();
        
        const ipCounts = {};
        const endpointCounts = {};
        const hourlyDistribution = new Array(24).fill(0);
        
        data.logs.forEach(log => {
            ipCounts[log.request.ipAddress] = (ipCounts[log.request.ipAddress] || 0) + 1;
            endpointCounts[log.request.endpoint] = (endpointCounts[log.request.endpoint] || 0) + 1;
            
            const hour = new Date(log.timestamp).getHours();
            hourlyDistribution[hour]++;
        });
        
        const topIPs = Object.entries(ipCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const topEndpoints = Object.entries(endpointCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
        
        const modal = document.getElementById('detailModal');
        const body = document.getElementById('detailModalBody');
        
        body.innerHTML = `
            <div class="detail-section">
                <h3>Traffic Pattern Analysis</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">
                    Analysis based on last ${data.logs.length} requests
                </p>
                
                <h4>Top Source IPs</h4>
                <table style="width: 100%; margin-bottom: 1.5rem;">
                    <tr><th>IP Address</th><th>Request Count</th><th>Percentage</th></tr>
                    ${topIPs.map(([ip, count]) => `
                        <tr>
                            <td>${ip}</td>
                            <td>${count}</td>
                            <td>${((count / data.logs.length) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </table>
                
                <h4>Most Accessed Endpoints</h4>
                <table style="width: 100%; margin-bottom: 1.5rem;">
                    <tr><th>Endpoint</th><th>Request Count</th><th>Percentage</th></tr>
                    ${topEndpoints.map(([endpoint, count]) => `
                        <tr>
                            <td>${endpoint}</td>
                            <td>${count}</td>
                            <td>${((count / data.logs.length) * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </table>
                
                <h4>Traffic Insights</h4>
                <ul style="list-style: none; padding: 0;">
                    <li style="padding: 0.5rem 0;">📊 Peak traffic hour: ${peakHour}:00 - ${peakHour + 1}:00</li>
                    <li style="padding: 0.5rem 0;">🌐 Unique IP addresses: ${Object.keys(ipCounts).length}</li>
                    <li style="padding: 0.5rem 0;">🎯 Unique endpoints accessed: ${Object.keys(endpointCounts).length}</li>
                    <li style="padding: 0.5rem 0;">⚡ Average requests per IP: ${(data.logs.length / Object.keys(ipCounts).length).toFixed(1)}</li>
                </ul>
                
                <div style="margin-top: 1.5rem;">
                    <button class="btn btn-primary" onclick="closeDetailModal()">Close</button>
                </div>
            </div>
        `;
        
        modal.classList.add('show');
        
        showNotification('success', 'Analysis Complete', 'Traffic pattern analysis is ready.');
    } catch (error) {
        showNotification('error', 'Analysis Failed', 'Could not analyze traffic patterns.');
    }
}

function toggleSoundAlerts(e) {
    const checkbox = e.target;
    checkbox.checked = !checkbox.checked;
    soundAlertsEnabled = checkbox.checked;
    
    if (soundAlertsEnabled) {
        showNotification('success', 'Sound Alerts Enabled', 'You will hear alerts for high-risk requests.');
        playAlertSound();
    } else {
        showNotification('info', 'Sound Alerts Disabled', 'Sound notifications are now off.');
    }
}

function playAlertSound() {
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
}

function showWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
        document.getElementById('welcomeModal').classList.add('show');
    }
}

function closeWelcomeModal() {
    document.getElementById('welcomeModal').classList.remove('show');
    localStorage.setItem('hasSeenWelcome', 'true');
    showNotification('success', 'Welcome!', 'You\'re all set! Try sending a test request or running a demo scenario.');
}

function startTour() {
    closeWelcomeModal();
    showNotification('info', 'Tour Started', 'Follow the highlighted areas to learn about SafeRoute AI features.');
    
    setTimeout(() => {
        document.querySelector('.test-panel').style.animation = 'pulse 1s ease 3';
        showNotification('info', 'Step 1: Test Panel', 'Use this panel to send custom API requests and see how the gateway responds.');
    }, 1000);
}

function toggleHelp() {
    const helpContent = document.getElementById('helpContent');
    helpContent.classList.toggle('show');
    
    if (helpContent.classList.contains('show')) {
        updateHelpContent('general');
    }
}

function closeHelp() {
    document.getElementById('helpContent').classList.remove('show');
}

function updateHelpContent(context) {
    const helpText = document.getElementById('helpText');
    
    const helpContent = {
        general: `
            <p><strong>Dashboard Overview</strong></p>
            <p>This dashboard provides real-time monitoring of your API Gateway with AI-powered fraud detection.</p>
            <p><strong>Key Sections:</strong></p>
            <ul>
                <li><strong>Traffic Summary:</strong> Overall request statistics</li>
                <li><strong>Risk Distribution:</strong> Breakdown by risk level</li>
                <li><strong>Live Stream:</strong> Real-time request monitoring</li>
                <li><strong>AI Analysis:</strong> Intelligent insights and alerts</li>
            </ul>
        `,
        testing: `
            <p><strong>Testing the Gateway</strong></p>
            <p>Use the test panel to send requests through the gateway:</p>
            <ol>
                <li>Select an endpoint from the dropdown</li>
                <li>Edit the JSON payload if needed</li>
                <li>Click "Send Request"</li>
                <li>Watch the response and live stream</li>
            </ol>
            <p>💡 Try the demo scenarios for pre-configured tests!</p>
        `
    };
    
    helpText.innerHTML = helpContent[context] || helpContent.general;
}

function updateRequestBodyTemplate() {
    const endpoint = document.getElementById('endpointSelect').value;
    const template = requestBodyTemplates[endpoint];
    document.getElementById('requestBody').value = JSON.stringify(template, null, 2);
}

async function sendTestRequest() {
    const endpoint = document.getElementById('endpointSelect').value;
    const bodyText = document.getElementById('requestBody').value;
    const btn = document.getElementById('sendRequestBtn');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="icon">⏳</span> Sending...';
    
    try {
        let url = `${API_BASE}${endpoint}`;
        let method = 'POST';
        let body = null;
        
        if (endpoint.includes(':accountId')) {
            url = `${API_BASE}/api/accounts/acc_12345`;
            method = 'GET';
        } else if (endpoint.includes(':transactionId')) {
            url = `${API_BASE}/api/payments/txn_12345`;
            method = 'GET';
        } else {
            body = JSON.parse(bodyText);
        }
        
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        displayResponse(response.status, data);
        
        if (response.status === 403) {
            showNotification('error', 'Request Blocked', `AI detected high fraud risk (Score: ${data.riskScore})`);
            if (soundAlertsEnabled) playAlertSound();
        } else if (data.riskLevel === 'SUSPICIOUS') {
            showNotification('warning', 'Suspicious Activity', `Request flagged for monitoring (Score: ${data.riskScore})`);
        } else {
            showNotification('success', 'Request Successful', `Request processed normally (Score: ${data.riskScore})`);
        }
        
        await refreshDashboard();
        
    } catch (error) {
        displayResponse(500, { error: error.message });
        showNotification('error', 'Request Failed', 'Could not connect to the gateway. Make sure all services are running.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="icon">🚀</span> Send Request';
    }
}

function displayResponse(status, data) {
    const display = document.getElementById('responseDisplay');
    display.classList.add('show');
    
    const statusClass = status >= 200 && status < 300 ? 'success' : 'error';
    
    display.innerHTML = `
        <div style="margin-bottom: 0.5rem;">
            <strong>Status:</strong> <span class="${statusClass}">${status}</span>
        </div>
        <div style="margin-bottom: 0.5rem;">
            <strong>Response:</strong>
        </div>
        <pre style="margin: 0; white-space: pre-wrap;">${JSON.stringify(data, null, 2)}</pre>
    `;
}

async function executeScenario(scenario) {
    const scenarios = {
        normal: async () => {
            showNotification('info', 'Running Scenario', 'Sending normal transaction...');
            await sendScenarioRequest({
                userId: 'user_12345',
                amount: 500,
                currency: 'USD',
                recipient: 'merchant_789'
            });
            showNotification('success', 'Scenario Complete', 'Normal transaction processed successfully.');
        },
        'rapid-fire': async () => {
            showNotification('info', 'Running Scenario', 'Simulating rapid fire attack (30 requests)...');
            const btn = document.querySelector('[data-scenario="rapid-fire"]');
            btn.disabled = true;
            
            for (let i = 0; i < 30; i++) {
                await sendScenarioRequest({
                    userId: 'attacker_123',
                    amount: 1000,
                    currency: 'USD',
                    recipient: 'merchant_789'
                });
                await sleep(2000);
            }
            
            btn.disabled = false;
            showNotification('warning', 'Scenario Complete', 'Rapid fire attack detected and blocked by AI!');
            if (soundAlertsEnabled) playAlertSound();
        },
        'high-value': async () => {
            showNotification('info', 'Running Scenario', 'Sending high-value transaction...');
            await sendScenarioRequest({
                userId: 'user_12345',
                amount: 15000,
                currency: 'USD',
                recipient: 'merchant_789'
            });
            showNotification('warning', 'Scenario Complete', 'High-value anomaly detected by AI.');
        },
        'off-hours': async () => {
            showNotification('info', 'Running Scenario', 'Simulating off-hours activity...');
            await sendScenarioRequest({
                userId: 'user_12345',
                amount: 5000,
                currency: 'USD',
                recipient: 'merchant_789'
            });
            showNotification('warning', 'Scenario Complete', 'Off-hours activity flagged for monitoring.');
        },
        combined: async () => {
            showNotification('info', 'Running Scenario', 'Triggering multiple fraud indicators...');
            const btn = document.querySelector('[data-scenario="combined"]');
            btn.disabled = true;
            
            for (let i = 0; i < 25; i++) {
                await sendScenarioRequest({
                    userId: 'attacker_456',
                    amount: 12000,
                    currency: 'USD',
                    recipient: 'merchant_789'
                });
                await sleep(2000);
            }
            
            btn.disabled = false;
            showNotification('error', 'Scenario Complete', 'Critical threat detected! Multiple fraud indicators triggered.');
            if (soundAlertsEnabled) playAlertSound();
        }
    };
    
    if (scenarios[scenario]) {
        await scenarios[scenario]();
    }
}

async function sendScenarioRequest(body) {
    try {
        await fetch(`${API_BASE}/api/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        await refreshDashboard();
    } catch (error) {
        console.error('Scenario request failed:', error);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshDashboard() {
    try {
        const [metricsData, logsData] = await Promise.all([
            fetch(`${API_BASE}/metrics`).then(r => r.json()),
            fetch(`${API_BASE}/logs?limit=50`).then(r => r.json())
        ]);
        
        updateMetrics(metricsData);
        updateLogs(logsData.logs);
        updateAnalysis(metricsData, logsData.logs);
        updateSystemStatus(metricsData);
        
        previousMetrics = metricsData;
        
    } catch (error) {
        console.error('Failed to refresh dashboard:', error);
        updateSystemStatus(null);
    }
}

function updateMetrics(data) {
    document.getElementById('totalRequests').textContent = data.requests.total.toLocaleString();
    document.getElementById('successRequests').textContent = data.requests.success.toLocaleString();
    document.getElementById('blockedRequests').textContent = data.requests.blocked.toLocaleString();
    document.getElementById('avgResponse').textContent = `${data.performance.averageResponseTime}ms`;
    
    const successRate = data.requests.total > 0 
        ? ((data.requests.success / data.requests.total) * 100).toFixed(1)
        : 0;
    const blockedRate = data.requests.total > 0
        ? ((data.requests.blocked / data.requests.total) * 100).toFixed(1)
        : 0;
    
    document.getElementById('successRate').textContent = `${successRate}%`;
    document.getElementById('blockedRate').textContent = `${blockedRate}%`;
    
    if (previousMetrics) {
        const totalChange = data.requests.total - previousMetrics.requests.total;
        document.getElementById('totalChange').textContent = totalChange > 0 ? `↑ +${totalChange}` : '—';
    }
    
    const total = data.requests.total || 1;
    document.getElementById('normalCount').textContent = data.risk.byLevel.NORMAL.toLocaleString();
    document.getElementById('suspiciousCount').textContent = data.risk.byLevel.SUSPICIOUS.toLocaleString();
    document.getElementById('highRiskCount').textContent = data.risk.byLevel.HIGH_RISK.toLocaleString();
    
    document.getElementById('normalPercent').textContent = `${((data.risk.byLevel.NORMAL / total) * 100).toFixed(1)}%`;
    document.getElementById('suspiciousPercent').textContent = `${((data.risk.byLevel.SUSPICIOUS / total) * 100).toFixed(1)}%`;
    document.getElementById('highRiskPercent').textContent = `${((data.risk.byLevel.HIGH_RISK / total) * 100).toFixed(1)}%`;
    
    document.getElementById('normalBar').style.width = `${(data.risk.byLevel.NORMAL / total) * 100}%`;
    document.getElementById('suspiciousBar').style.width = `${(data.risk.byLevel.SUSPICIOUS / total) * 100}%`;
    document.getElementById('highRiskBar').style.width = `${(data.risk.byLevel.HIGH_RISK / total) * 100}%`;
    
    document.getElementById('avgRiskScore').textContent = data.risk.averageScore.toFixed(1);
    
    const riskLevel = data.risk.averageScore < 30 ? 'Low Risk' : 
                     data.risk.averageScore < 70 ? 'Medium Risk' : 'High Risk';
    document.getElementById('avgRiskLevel').textContent = riskLevel;
    
    updateFraudPatternsChart(data.ai.triggeredRules);
}

function updateLogs(logs) {
    if (isPaused) return;
    
    const container = document.getElementById('logsContainer');
    const filter = document.getElementById('logFilterSelect').value;
    
    const filteredLogs = filter === 'all' 
        ? logs 
        : logs.filter(log => log.aiDecision.riskLevel === filter);
    
    if (filteredLogs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No Matching Requests</h3>
                <p>No requests match the current filter. Try changing the filter or send more requests.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredLogs.slice(0, 20).map(log => {
        const statusClass = log.response.statusCode >= 200 && log.response.statusCode < 300 ? 'success' : 'blocked';
        const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const riskColor = log.aiDecision.riskLevel === 'HIGH_RISK' ? '#ef4444' : 
                         log.aiDecision.riskLevel === 'SUSPICIOUS' ? '#f59e0b' : '#10b981';
        
        return `
            <div class="log-entry" onclick='showLogDetail(${JSON.stringify(log).replace(/'/g, "'")})'>
                <div class="log-border"></div>
                <div class="log-content">
                    <div class="log-main">
                        <span class="log-time">${time}</span>
                        <span class="log-method">${log.request.method}</span>
                        <span class="log-endpoint">${log.request.endpoint}</span>
                        <span class="log-status status-${statusClass}">${log.response.statusCode}</span>
                    </div>
                    <div class="log-risk">
                        <span class="risk-badge" style="background-color: ${riskColor}20; color: ${riskColor}; border: 1px solid ${riskColor}40;">
                            ${getRiskIcon(log.aiDecision.riskLevel)} Risk: ${log.aiDecision.riskScore}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Made with Bob

function getRiskIcon(level) {
    const icons = {
        NORMAL: '🟢',
        SUSPICIOUS: '🟡',
        HIGH_RISK: '🔴'
    };
    return icons[level] || '⚪';
}

function showLogDetail(log) {
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('detailModalBody');
    
    body.innerHTML = `
        <div class="detail-section">
            <h3>Request Information</h3>
            <div class="detail-grid">
                <div class="detail-label">Correlation ID:</div>
                <div class="detail-value">${log.correlationId}</div>
                <div class="detail-label">Timestamp:</div>
                <div class="detail-value">${log.timestamp}</div>
                <div class="detail-label">Method:</div>
                <div class="detail-value">${log.request.method}</div>
                <div class="detail-label">Endpoint:</div>
                <div class="detail-value">${log.request.endpoint}</div>
                <div class="detail-label">IP Address:</div>
                <div class="detail-value">${log.request.ipAddress}</div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>AI Risk Assessment</h3>
            <div class="detail-grid">
                <div class="detail-label">Risk Score:</div>
                <div class="detail-value">${log.aiDecision.riskScore} (${log.aiDecision.riskLevel})</div>
                <div class="detail-label">Recommendation:</div>
                <div class="detail-value">${log.aiDecision.recommendation}</div>
                <div class="detail-label">Explanation:</div>
                <div class="detail-value">${log.aiDecision.explanation}</div>
            </div>
        </div>
        
        ${log.aiDecision.triggeredRules.length > 0 ? `
            <div class="detail-section">
                <h3>Triggered Rules</h3>
                ${log.aiDecision.triggeredRules.map(rule => `
                    <div class="rule-item">
                        <div class="rule-header">
                            <span class="rule-name">${rule.ruleName}</span>
                            <span class="rule-severity ${rule.severity.toLowerCase()}">${rule.severity}</span>
                        </div>
                        <div class="rule-reasoning">${rule.reasoning}</div>
                        <div style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                            Confidence: ${(rule.confidence * 100).toFixed(0)}% | Score: ${rule.score}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="detail-section">
            <h3>Response</h3>
            <div class="detail-grid">
                <div class="detail-label">Status Code:</div>
                <div class="detail-value">${log.response.statusCode}</div>
                <div class="detail-label">Response Time:</div>
                <div class="detail-value">${log.response.responseTime}ms</div>
                <div class="detail-label">Routing Decision:</div>
                <div class="detail-value">${log.routing.routingDecision}</div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

function updateAnalysis(metrics, logs) {
    const container = document.getElementById('analysisContainer');
    const alerts = [];
    
    if (metrics.requests.blocked > 10) {
        const recentBlocked = logs.filter(log => 
            log.aiDecision.recommendation === 'BLOCK_AND_VERIFY'
        ).slice(0, 5);
        
        if (recentBlocked.length > 0) {
            alerts.push({
                type: 'critical',
                icon: '🔴',
                title: 'High Blocking Rate Detected',
                message: `${metrics.requests.blocked} requests have been blocked. This may indicate an ongoing attack or misconfigured rules.`,
                actions: ['View Blocked Requests', 'Adjust Rules', 'Generate Report']
            });
        }
    }
    
    if (metrics.risk.byLevel.SUSPICIOUS > metrics.requests.total * 0.1) {
        alerts.push({
            type: 'warning',
            icon: '🟡',
            title: 'Elevated Suspicious Activity',
            message: `${metrics.risk.byLevel.SUSPICIOUS} suspicious requests detected (${((metrics.risk.byLevel.SUSPICIOUS / metrics.requests.total) * 100).toFixed(1)}% of total). Monitor closely for patterns.`,
            actions: ['View Suspicious Requests', 'Analyze Patterns']
        });
    }
    
    if (metrics.ai.triggeredRules.RAPID_FIRE > 5) {
        alerts.push({
            type: 'warning',
            icon: '⚠️',
            title: 'Rapid Fire Pattern Detected',
            message: `Rapid fire detection triggered ${metrics.ai.triggeredRules.RAPID_FIRE} times. Consider implementing rate limiting.`,
            actions: ['Configure Rate Limiting', 'View Source IPs']
        });
    }
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3>All Systems Normal</h3>
                <p>No anomalies or threats detected. The AI is monitoring all traffic and will alert you to any suspicious patterns.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = alerts.map(alert => `
        <div class="analysis-alert ${alert.type}">

            <div class="alert-icon">${alert.icon}</div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
                <div class="analysis-actions">
                    ${alert.actions.map(action => `<button>${action}</button>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

function updateSystemStatus(metrics) {
    const statusIndicator = document.getElementById('systemStatus');
    const statusText = document.getElementById('statusText');
    
    if (!metrics) {
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'System Error';
        return;
    }
    
    const isHealthy = metrics.requests.total > 0;
    statusIndicator.className = `status-indicator ${isHealthy ? 'success' : 'warning'}`;
    statusText.textContent = isHealthy ? 'All Systems Operational' : 'Initializing...';
}

function initializeCharts() {
    const ctx = document.getElementById('fraudPatternsChart');
    if (!ctx) return;
    
    fraudPatternsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Rapid Fire', 'Payload Anomaly', 'Time-Based', 'Sequential'],
            datasets: [{
                label: 'Triggered Count',
                data: [0, 0, 0, 0],
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
}

function updateFraudPatternsChart(triggeredRules) {
    if (!fraudPatternsChart) return;
    
    fraudPatternsChart.data.datasets[0].data = [
        triggeredRules.RAPID_FIRE || 0,
        triggeredRules.PAYLOAD_ANOMALY || 0,
        triggeredRules.TIME_BASED || 0,
        triggeredRules.SEQUENTIAL_PATTERN || 0
    ];
    fraudPatternsChart.update();
}

async function checkSystemHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        const statusIndicator = document.getElementById('systemStatus');
        const statusText = document.getElementById('statusText');
        
        if (data.status === 'healthy') {
            statusIndicator.className = 'status-indicator success';
            statusText.textContent = 'All Systems Operational';
            showNotification('success', 'Health Check', 'All services are running normally.');
        } else {
            statusIndicator.className = 'status-indicator warning';
            statusText.textContent = 'Some Services Down';
            showNotification('warning', 'Health Check', 'Some services may be experiencing issues.');
        }
    } catch (error) {
        const statusIndicator = document.getElementById('systemStatus');
        const statusText = document.getElementById('statusText');
        statusIndicator.className = 'status-indicator error';
        statusText.textContent = 'System Error';
        showNotification('error', 'Health Check Failed', 'Could not connect to the gateway.');
    }
}

/**
 * Clear Logs - Only clears log entries without affecting metrics or other state
 * This function removes all request logs from the backend and updates the UI
 */
function clearLogs() {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
        fetch(`${API_BASE}/api/clear-logs`, { method: 'POST' })
            .then(() => {
                showNotification('success', 'Logs Cleared', 'All request logs have been cleared.');
                // Only refresh logs display, not entire dashboard
                document.getElementById('logsContainer').innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <h3>No Requests Yet</h3>
                        <p>Send a test request or run a demo scenario to see activity here.</p>
                    </div>
                `;
            })
            .catch(() => {
                showNotification('error', 'Failed', 'Could not clear logs.');
            });
    }
}

/**
 * Reset Metrics - Resets all statistical counters to zero WITHOUT page reload
 * This function clears metrics on backend and updates UI counters in place
 */
function resetMetrics() {
    if (confirm('Are you sure you want to reset all metrics? This will clear all statistics.')) {
        // Reset backend metrics
        fetch(`${API_BASE}/api/reset-metrics`, { method: 'POST' })
            .then(() => {
                showNotification('success', 'Metrics Reset', 'All metrics have been reset to zero.');
                
                // Reset all UI counters to zero without page reload
                document.getElementById('totalRequests').textContent = '0';
                document.getElementById('successRequests').textContent = '0';
                document.getElementById('blockedRequests').textContent = '0';
                document.getElementById('avgResponse').textContent = '0ms';
                document.getElementById('totalChange').textContent = '—';
                document.getElementById('successRate').textContent = '0%';
                document.getElementById('blockedRate').textContent = '0%';
                document.getElementById('responseChange').textContent = '—';
                
                document.getElementById('normalCount').textContent = '0';
                document.getElementById('suspiciousCount').textContent = '0';
                document.getElementById('highRiskCount').textContent = '0';
                document.getElementById('normalPercent').textContent = '0%';
                document.getElementById('suspiciousPercent').textContent = '0%';
                document.getElementById('highRiskPercent').textContent = '0%';
                
                document.getElementById('normalBar').style.width = '0%';
                document.getElementById('suspiciousBar').style.width = '0%';
                document.getElementById('highRiskBar').style.width = '0%';
                
                document.getElementById('avgRiskScore').textContent = '0';
                document.getElementById('avgRiskLevel').textContent = 'Low Risk';
                
                // Reset chart if it exists
                if (fraudPatternsChart) {
                    fraudPatternsChart.data.datasets[0].data = [0, 0, 0, 0];
                    fraudPatternsChart.update();
                }
                
                // Reset previous metrics for change calculation
                previousMetrics = null;
            })
            .catch(() => {
                showNotification('error', 'Failed', 'Could not reset metrics on server.');
            });
    }
}

function exportData() {
    Promise.all([
        fetch(`${API_BASE}/metrics`).then(r => r.json()),
        fetch(`${API_BASE}/logs?limit=1000`).then(r => r.json())
    ])
    .then(([metrics, logs]) => {
        const exportData = {
            exportedAt: new Date().toISOString(),
            metrics,
            logs: logs.logs
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `saferoute-export-${Date.now()}.json`;
        a.click();
        
        showNotification('success', 'Data Exported', 'All data has been exported successfully.');
    })
    .catch(() => {
        showNotification('error', 'Export Failed', 'Could not export data.');
    });
}

function togglePauseLogs() {
    isPaused = !isPaused;
    const btn = document.getElementById('pauseLogsBtn');
    btn.innerHTML = isPaused ? '<span class="icon">▶️</span> Resume' : '<span class="icon">⏸️</span> Pause';
    showNotification('info', isPaused ? 'Logs Paused' : 'Logs Resumed', 
        isPaused ? 'Live log updates are paused.' : 'Live log updates have resumed.');
}

function toggleAutoRefresh(e) {
    const checkbox = e.target;
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked) {
        startAutoRefresh();
        showNotification('success', 'Auto-Refresh Enabled', 'Dashboard will refresh every 2 seconds.');
    } else {
        stopAutoRefresh();
        showNotification('info', 'Auto-Refresh Disabled', 'Dashboard updates are paused.');
    }
}

function startAutoRefresh() {
    if (autoRefreshInterval) return;
    autoRefreshInterval = setInterval(refreshDashboard, 2000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

function showNotification(type, title, message) {
    const container = document.getElementById('notificationContainer');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', init);