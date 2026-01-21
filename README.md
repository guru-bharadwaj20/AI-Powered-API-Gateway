# SafeRoute AI - Intelligent API Gateway with Fraud Detection

## 🎯 Overview

**SafeRoute AI** is an intelligent API Gateway built for the IBM Bobathon hackathon, providing real-time fraud detection and intelligent routing for fintech platforms using AI-powered analysis.

## ✨ Core Features

- **Single API Gateway** routing to 3+ backend microservices
- **AI-Powered Fraud Detection** with explainable rule-based scoring
- **Real-time Monitoring Dashboard** with interactive visualizations
- **Intelligent Routing** based on risk assessment and anomaly detection
- **Complete Request Traceability** via correlation IDs (UUID v4)
- **Comprehensive Observability** with metrics, logs, and health endpoints
- **Light Mode UI** with responsive design and gradient animations
- **Live Request Stream** with color-coded status indicators
- **Test Panel** for custom API requests and demo scenarios

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   API Gateway (Port 3000)       │
│   - Request Routing             │
│   - AI Fraud Detection          │
│   - Correlation ID Management   │
│   - Metrics Collection          │
└─────────┬───────────────────────┘
          │
    ┌─────┴─────┬─────────────┐
    ▼           ▼             ▼
┌─────────┐ ┌─────────┐ ┌──────────────┐
│ Payment │ │ Account │ │Verification  │
│ Service │ │ Service │ │Service       │
│ (3001)  │ │ (3002)  │ │(3003)        │
└─────────┘ └─────────┘ └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start all services:**
   ```bash
   npm run start:all
   ```

3. **Access dashboard:**
   ```
   http://localhost:3000
   ```

### Individual Service Startup

```bash
# Terminal 1 - API Gateway
npm start

# Terminal 2 - Payment Service
npm run start:payment

# Terminal 3 - Account Service
npm run start:account

# Terminal 4 - Verification Service
npm run start:verification
```

## 📡 API Endpoints

### Gateway Routes (Port 3000)

#### `POST /api/payments`
Create payment transaction with fraud detection
- **Request:** `{ userId, amount, currency, recipient, description }`
- **Response:** `{ transactionId, status, riskScore, riskLevel, correlationId }`

#### `GET /api/accounts/:accountId`
Retrieve account details
- **Response:** `{ accountId, userId, balance, status, riskScore, correlationId }`

#### `GET /api/payments/:transactionId`
Retrieve payment transaction details

#### `POST /api/verify/identity`
Verify user identity
- **Request:** `{ userId, documentType, documentNumber }`

### Observability Endpoints

#### `GET /metrics`
System metrics and statistics
- Total requests, blocked requests, average risk score
- Request distribution by risk level
- AI rule trigger counts

#### `GET /logs`
Request logs with filtering
- **Query params:** `limit` (default: 50), `riskLevel` (NORMAL/SUSPICIOUS/HIGH_RISK)

#### `GET /health`
System health check

#### `POST /api/clear-logs`
Clear all stored logs

#### `POST /api/reset-metrics`
Reset all metrics to zero

## 🤖 AI Fraud Detection

### Detection Rules

**1. Rapid Fire Detection**
- Monitors requests per IP in 60-second window
- Triggers: >20 requests/minute
- Score: 40-95 (severity-based)

**2. Payload Anomaly Detection**
- Statistical analysis of transaction amounts
- Detects outliers >2σ from mean
- Score: 30-45 (deviation-based)

**3. Time-Based Anomaly**
- Flags high-value transactions during off-hours
- Business hours: 9 AM - 9 PM
- Score: 15-25 (amount-based)

**4. Sequential Pattern Detection**
- Identifies replay attacks via payload hashing
- Triggers: 3+ identical requests in 5 minutes
- Score: 25-40 (frequency-based)

### Risk Levels

| Level | Score | Action |
|-------|-------|--------|
| **NORMAL** | 0-30 | Allow processing |
| **SUSPICIOUS** | 31-69 | Monitor closely |
| **HIGH_RISK** | 70-100 | Block or verify |

### Routing Decisions

- **ALLOW_NORMAL** - Route to intended service
- **ALLOW_WITH_MONITORING** - Route with warning headers
- **BLOCK_AND_VERIFY** - Block request, return 403
- **REQUIRE_ADDITIONAL_AUTH** - Route to verification service

## 🎨 Dashboard Features

### Recent UI Enhancements

**Light Mode Design**
- Clean, professional light theme with high contrast
- Gradient header with primary/secondary colors
- Responsive layout with CSS Grid and Flexbox

**Live Request Stream**
- Yellow left border (4px) for visual emphasis
- 12-hour time format with AM/PM
- Horizontal layout: Time → Method → Endpoint → Status
- Color-coded status: Green (2xx), Yellow (3xx), Red (4xx/5xx)
- Dynamic risk badges with severity colors
- Hover effects and smooth transitions

**Interactive Elements**
- Test Panel with JSON input/output
- Demo Scenarios (pre-built fraud patterns)
- Quick Actions sidebar (Clear Logs, Reset Metrics)
- Auto-refresh toggle with sound alerts
- Export data functionality

**Fraud Detection Patterns**
- Real-time pattern visualization
- Severity badges (HIGH/MEDIUM/LOW)
- Detection count tracking
- Auto-refresh every 5 seconds

### Demo Scenarios

- **Normal Transaction** - Legitimate payment request
- **Rapid Fire Attack** - 30 requests in 60 seconds
- **High-Value Anomaly** - Payment 10x above average
- **Off-Hours Activity** - Large transaction at 2 AM
- **Combined Threat** - Multiple fraud indicators

## 🔍 Correlation IDs

Every request receives a unique UUID v4 correlation ID:
- Tracks requests end-to-end across services
- Appears in all logs and responses
- Propagates to backend services via headers
- Returns in `X-Correlation-ID` response header

**Example:** `550e8400-e29b-41d4-a716-446655440000`

## ✅ Hackathon Requirements

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Single API Gateway | ✅ | Port 3000 routing to 3 services |
| 3+ Route Configurations | ✅ | POST, GET, path parameters |
| Request/Response Logging | ✅ | Correlation IDs + timestamps |
| AI-Driven Intelligence | ✅ | 4 fraud detection rules |
| Observability Endpoint | ✅ | /metrics, /logs, /health |
| Web-Based UI | ✅ | Responsive dashboard |

## 🛠️ Technology Stack

**Backend**
- Node.js + Express.js
- Rule-based AI fraud detection
- In-memory storage with JSON logs

**Frontend**
- HTML5 + CSS3 (Custom Properties)
- Vanilla JavaScript (ES6+)
- Chart.js for visualizations
- Responsive design with media queries

**Recent Technical Updates**
- Enhanced `updateLogs()` function with new HTML structure
- CSS styling for log entries with hover effects
- Fixed duplicate notification bug in navigation
- Implemented proper JSON file fetching and parsing
- Light mode conversion with updated CSS variables

## 📁 Project Structure

```
saferoute-ai/
├── backend/
│   ├── gateway/
│   │   └── server.js              # API Gateway + routing
│   ├── services/
│   │   ├── payment-service.js     # Port 3001
│   │   ├── account-service.js     # Port 3002
│   │   └── verification-service.js # Port 3003
│   └── ai/
│       └── fraud-detection.js     # AI Engine
├── frontend/
│   ├── index.html                 # Dashboard UI
│   ├── styles.css                 # Light mode styling
│   └── app.js                     # Interactive logic
├── test-cases/
│   ├── normal-traffic/            # Legitimate requests
│   ├── rapid-fire/                # Attack scenarios
│   └── generate-test-cases.js     # Test generator
├── package.json
└── README.md
```

## 🧪 Testing

### Using Dashboard Demo Scenarios

1. Open dashboard at `http://localhost:3000`
2. Navigate to Test Panel
3. Select demo scenario from dropdown
4. Click "Send Test Request"
5. Observe Live Request Stream and AI analysis

### Using cURL

**Normal Request:**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_12345","amount":500,"currency":"USD","recipient":"merchant_789"}'
```

**High-Value Request (triggers anomaly):**
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_12345","amount":15000,"currency":"USD","recipient":"merchant_789"}'
```

**Rapid Fire Attack (run multiple times):**
```bash
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/payments \
    -H "Content-Type: application/json" \
    -d '{"userId":"attacker","amount":100,"currency":"USD"}' &
done
```

## 🐛 Troubleshooting

**Services won't start**
- Check ports 3000-3003 availability: `lsof -i :3000-3003`
- Verify Node.js version: `node --version` (16+ required)
- Reinstall dependencies: `rm -rf node_modules && npm install`

**Dashboard not loading**
- Confirm API Gateway running: `curl http://localhost:3000/health`
- Check browser console for errors (F12)
- Verify CORS headers in server.js

**Metrics not updating**
- Enable auto-refresh toggle in dashboard
- Check network tab for failed API calls
- Restart services: `npm run start:all`

**Duplicate notifications**
- Fixed in latest version (direct function calls instead of button clicks)
- Clear browser cache if issue persists

## 🎤 Demo Presentation Guide

1. **Introduction** - Show welcome modal, explain system purpose
2. **Normal Flow** - Demonstrate legitimate transaction processing
3. **Fraud Detection** - Run rapid fire attack scenario
4. **AI Explanations** - Highlight risk scoring and reasoning
5. **Correlation Tracking** - Show end-to-end request tracing
6. **Observability** - Display metrics dashboard and logs
7. **Real-time Updates** - Emphasize live request stream
8. **Export Data** - Demonstrate data export functionality

## 📄 License

MIT License - Created for IBM Bobathon Hackathon

## 👥 Team

**SafeRoute AI Team** - MindOverModels Team 2

---

**Built with ❤️ for IBM Bobathon 2026**