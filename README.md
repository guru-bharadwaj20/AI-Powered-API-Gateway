# SafeRoute AI — Intelligent API Gateway with Fraud Detection

A full-stack Node.js + React application that demonstrates an **AI-powered API Gateway** for fintech platforms. Every incoming API request is analyzed by a rule-based fraud-detection engine before being routed to the appropriate microservice. A live React dashboard monitors all traffic in real-time.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  React Dashboard (port 3000)             │
│  Metrics · Risk Charts · Live Stream · AI Insights       │
└────────────────────────┬─────────────────────────────────┘
                         │ fetches /metrics /logs /health
                         ▼
┌──────────────────────────────────────────────────────────┐
│              API Gateway  (port 4000)                    │
│  ┌──────────────────┐   ┌───────────────────────────┐   │
│  │  Fraud Detection │ → │  Intelligent Router       │   │
│  │  (rule engine)   │   │  BLOCK / ALLOW / MONITOR  │   │
│  └──────────────────┘   └────────────┬──────────────┘   │
└───────────────────────────────────────┼──────────────────┘
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   ┌──────────┐ ┌──────────┐ ┌──────────────┐
                   │ Payment  │ │ Account  │ │Verification  │
                   │ Svc 3001 │ │ Svc 3002 │ │Svc 3003      │
                   └──────────┘ └──────────┘ └──────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Tailwind CSS 3, Chart.js 4 |
| Backend | Node.js, Express 4 |
| AI Engine | Custom rule-based scoring (no external API needed) |
| Dev tooling | Concurrently, Nodemon |

---

## Quick Start

### Prerequisites
- **Node.js 18+** and **npm**

### 1 — Install dependencies

```bash
# Root (backend)
npm install

# Frontend
cd frontend
npm install
cd ..
```

### 2 — Start everything

```bash
npm run dev
```

This single command starts all four backend services and the Vite dev server. The browser opens automatically at **http://localhost:3000**.

### Alternative: start backend and frontend separately

```bash
# Terminal 1 — all backend services
npm start

# Terminal 2 — React dev server
cd frontend && npm start
```

---

## Project Structure

```
AI-Powered-API-Gateway/
├── backend/
│   ├── gateway/
│   │   └── server.js           # API Gateway — port 4000
│   ├── services/
│   │   ├── payment-service.js  # Payment microservice — port 3001
│   │   ├── account-service.js  # Account microservice — port 3002
│   │   └── verification-service.js  # Verification microservice — port 3003
│   └── ai/
│       └── fraud-detection.js  # Fraud detection engine
│
├── frontend/
│   ├── index.html              # Vite entry point
│   ├── vite.config.js          # Vite + proxy config
│   ├── tailwind.config.js
│   └── src/
│       ├── components/         # React UI components
│       ├── hooks/              # useMetrics, useLogs, useNotification
│       ├── App.js
│       └── index.js
│
├── scripts/
│   └── dev.js                  # Orchestrates backend + frontend together
├── start.js                    # Starts backend services only
└── package.json
```

---

## API Reference

All routes are served by the gateway on **port 4000**. Each request is analyzed by the fraud engine before forwarding.

### Payment Operations
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/payments` | Create a payment (fraud-checked) |
| `GET`  | `/api/payments/:transactionId` | Retrieve a transaction |

### Account Operations
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/accounts` | Create an account |
| `GET`  | `/api/accounts/:accountId` | Get account details |
| `PUT`  | `/api/accounts/:accountId` | Update account |

### Verification Operations
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/verify/identity` | Verify user identity |
| `POST` | `/api/verify/transaction` | Verify a transaction |

### System Endpoints
| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Gateway health check |
| `GET` | `/metrics` | Real-time metrics JSON |
| `GET` | `/logs?limit=N&riskLevel=X` | Filtered request logs |
| `GET` | `/api/fraud-patterns` | Active fraud patterns |
| `POST` | `/api/clear-logs` | Clear request log buffer |
| `POST` | `/api/reset-metrics` | Reset all statistics |

---

## Fraud Detection Engine

Every request is scored 0–100 by four independent rules:

| Rule | Trigger | Max Score |
|---|---|---|
| **Rapid Fire** | > 10 requests/IP in 60 s | 95 |
| **Payload Anomaly** | Transaction amount > 2σ from rolling mean | 45 |
| **Temporal Anomaly** | High-value transaction outside 9 AM–9 PM | 25 |
| **Replay Attack** | Identical payload repeated ≥ 3× in 5 min | 40 |

**Risk levels and actions:**

| Score | Level | Action |
|---|---|---|
| 0–30 | NORMAL | Forward normally |
| 31–69 | SUSPICIOUS | Forward + flag for monitoring |
| 70+ | HIGH_RISK | Block (403) for payment routes |

---

## Dashboard Features

- **Service Health** — live status of all four services, polled every 10 s
- **Traffic Summary** — gradient metric cards: total, successful, blocked, avg latency
- **Detection Analytics** — fraud-rule bar chart + risk-distribution doughnut chart
- **Risk Overview** — stacked progress bars + session statistics
- **Live Request Stream** — filterable log feed with risk badge, target service, response time
- **AI Analysis** — auto-generated alerts with actionable buttons (view blocked, analyze patterns, generate JSON report)
- **Test Panel** — send any gateway request from the sidebar
- **Demo Scenarios** — one-click attack simulations (rapid fire, statistical anomaly, off-hours, combined threat)
- **Export** — download all metrics + logs as a JSON report

---

## npm Scripts

```bash
# Root package
npm run dev            # Start backend + frontend (recommended)
npm start              # Start backend services only
npm run dev:backend    # Start backend with nodemon hot-reload

# Frontend (cd frontend first)
npm start              # Vite dev server on port 3000
npm run build          # Production build → frontend/build/
npm run preview        # Preview production build
```

---

## License

MIT
