# SafeRoute AI - Intelligent API Gateway with Fraud Detection

## 🎯 Overview

**SafeRoute AI** is an intelligent API Gateway providing real-time fraud detection and intelligent routing for fintech platforms using AI-powered analysis.

## ✨ Features

- Single API Gateway routing to 3+ backend microservices
- AI-Powered Fraud Detection with explainable rule-based scoring
- Real-time Monitoring Dashboard with interactive visualizations
- Intelligent Routing based on risk assessment
- Complete Request Traceability via correlation IDs (UUID v4)
- Responsive React UI with Tailwind CSS and mobile support
- Live Request Stream with color-coded status indicators

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   API Gateway (Port 4000)       │
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

 React Dashboard (Dev): http://localhost:3000
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation

**1. Install backend dependencies:**
```bash
npm install
```

**2. Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

**3. Start everything:**
```bash
npm run dev
```

This starts all backend services and the React frontend automatically.

### Alternative: Start Services Separately

```bash
# Terminal 1 - Backend services (gateway + microservices)
npm start

# Terminal 2 - React frontend
npm run start:frontend
```

## 📁 Project Structure

```
AI-Powered-API-Gateway/
├── backend/
│   ├── gateway/
│   │   └── server.js          # API Gateway (Port 4000)
│   ├── services/
│   │   ├── payment-service.js     # Payment Service (Port 3001)
│   │   ├── account-service.js     # Account Service (Port 3002)
│   │   └── verification-service.js # Verification Service (Port 3003)
│   └── ai/
│       └── fraud-detection.js     # AI Fraud Detection Engine
│
├── frontend/
│   ├── src/
│   │   ├── components/            # React Components
│   │   ├── hooks/                 # Custom React Hooks
│   │   └── App.js                 # Main App Component
│   ├── public/
│   └── package.json
│
├── package.json
├── start.js
└── README.md
```

## 📡 API Endpoints

### Gateway Routes (Port 4000)

#### Payment Operations
- `POST /api/payments` - Create payment transaction with fraud detection
- `GET /api/payments/:id` - Get payment transaction details

#### Account Operations
- `POST /api/accounts` - Create new account
- `GET /api/accounts/:id` - Get account information
- `PUT /api/accounts/:id` - Update account details

#### Verification Operations
- `POST /api/verify/identity` - Verify user identity
- `POST /api/verify/phone` - Verify phone number
- `POST /api/verify/email` - Verify email address

#### System Endpoints
- `GET /metrics` - Get real-time metrics and statistics
- `GET /logs` - Get request logs with correlation IDs
- `GET /health` - Health check endpoint

## 🔍 Fraud Detection Rules

The AI engine analyzes requests using multiple detection rules:

- **Rapid Fire Detection** - Identifies suspiciously frequent requests
- **Payload Anomaly Detection** - Detects unusual request patterns
- **Time-Based Analysis** - Flags off-hours transactions
- **Sequential Pattern Recognition** - Identifies systematic testing
- **Geo-Velocity Analysis** - Detects impossible location changes

## 🎨 Frontend Features

- **Interactive Dashboard** with real-time metrics
- **Live Request Monitoring** with filtering
- **Test Panel** for API testing
- **Demo Scenarios** for fraud detection demos
- **Responsive Design** with mobile support
- **Hamburger Menu** for mobile navigation
- **Risk Visualization** with charts and graphs

## 🛠️ Development

### Available Scripts

```bash
npm start              # Start backend services (gateway + microservices)
npm run start:all      # Start backend services (same goal as npm start)
npm run start:frontend # Start React frontend only
npm run dev            # Start everything (backend + frontend)
npm run dev:backend    # Start backend services with nodemon (hot reload)
```

## 📊 Monitoring

Access the dashboard at `http://localhost:3000` after starting the services to view:
- Real-time traffic metrics
- Risk distribution
- Live request stream
- AI analysis insights
- Fraud detection patterns

Gateway endpoints are available at `http://localhost:4000` (e.g. `/metrics`, `/logs`).

## 🔐 Security Features

- Real-time fraud scoring
- Request correlation tracking
- Anomaly detection
- Risk-based routing
- Complete audit trail

## 📝 License

MIT License

---

**SafeRoute AI** - Intelligent API Gateway for Secure Transactions
