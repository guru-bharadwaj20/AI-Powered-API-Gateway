# API Gateway — Explainable Fraud Detection

A production-grade API gateway with a **rule-based fraud detection engine**, structured persistence, rate limiting, JWT authentication, OpenAPI docs, and a real-time SOC dashboard.

---

## Architecture

```
Browser (React + Vite)   :3000
        │
        ▼
API Gateway              :4000   ── rate limit, JWT, Zod validation
        │
        ├── Fraud Detection Service :4001   (7-rule engine, confidence scoring)
        │
        ├── Payment Service         :3001
        ├── Account Service         :3002
        └── Verification Service    :3003
```

All API traffic is scored by the Fraud Detection Service before being forwarded downstream.
Requests that exceed the HIGH_RISK threshold are **blocked** with a 403 response.
The engine is fully deterministic and explainable — no machine learning, no black-box decisions.

---

## Quick Start

### Local (Node.js)

```bash
# Install all dependencies
npm install
cd frontend && npm install && cd ..

# Build the React dashboard
cd frontend && npm run build && cd ..

# Start all 5 backend services + open browser
npm start
```

Services start in order: Payment → Account → Verification → Fraud → Gateway.
Dashboard: `http://localhost:3000`

### Docker (one command)

```bash
docker compose up --build
```

---

## Tech Stack

| Layer            | Technology                                          |
|------------------|-----------------------------------------------------|
| Frontend         | React 19, Vite 6, Tailwind CSS 3, Chart.js 4        |
| API Gateway      | Node.js 22, Express 4                               |
| Fraud Engine     | Standalone HTTP microservice (port 4001)            |
| Logging          | Pino (structured JSON / coloured dev output)        |
| Validation       | Zod 3 (request body schemas)                        |
| Auth             | jsonwebtoken (optional Bearer token)                |
| API Docs         | OpenAPI 3.0 via swagger-ui-express                  |
| Persistence      | JSON file repository (swap for PostgreSQL)          |
| Rate Limiting    | Sliding-window in-memory (Redis-ready interface)    |

---

## Service Ports

| Service            | Port |
|--------------------|------|
| React Dashboard    | 3000 |
| Payment Service    | 3001 |
| Account Service    | 3002 |
| Verification Svc   | 3003 |
| API Gateway        | 4000 |
| Fraud Detection    | 4001 |

---

## API Reference

### Payment Routes

| Method | Path                          | Description                |
|--------|-------------------------------|----------------------------|
| POST   | /api/payments                 | Create a payment           |
| GET    | /api/payments/:transactionId  | Get payment by ID          |

### Account Routes

| Method | Path                        | Description        |
|--------|-----------------------------|--------------------|
| POST   | /api/accounts               | Create an account  |
| GET    | /api/accounts/:accountId    | Get account by ID  |
| PUT    | /api/accounts/:accountId    | Update an account  |

### Verification Routes

| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| POST   | /api/verify/identity    | Verify user identity     |
| POST   | /api/verify/transaction | Verify a transaction     |

### Auth

| Method | Path              | Description               |
|--------|-------------------|---------------------------|
| POST   | /api/auth/token   | Issue JWT (if configured) |

### System / Observability

| Method | Path                      | Description                         |
|--------|---------------------------|-------------------------------------|
| GET    | /health                   | Gateway health check                |
| GET    | /metrics                  | JSON metrics snapshot               |
| GET    | /metrics/prometheus       | Prometheus-compatible text metrics  |
| GET    | /logs                     | Paginated request log               |
| GET    | /logs/timeline            | Minute-by-minute risk breakdown     |
| GET    | /logs/endpoint-heatmap    | Request counts per endpoint         |
| GET    | /logs/fraud-events        | HIGH_RISK fraud event log           |
| GET    | /api/fraud-patterns       | Triggered rule frequency table      |
| POST   | /api/clear-logs           | Clear persisted request logs        |
| POST   | /api/reset-metrics        | Reset all metrics and logs          |
| GET    | /api-docs                 | Swagger UI (OpenAPI 3.0)            |

---

## Fraud Detection Engine

Runs as a standalone HTTP microservice on port 4001.  
**All rules are deterministic and traceable.** Every decision includes:

- `riskScore` (0–100)
- `riskLevel` — `NORMAL` / `SUSPICIOUS` / `HIGH_RISK`
- `confidence` (0–1)
- `recommendation` — `ALLOW_NORMAL` / `ALLOW_WITH_MONITORING` / `REQUIRE_ADDITIONAL_AUTH` / `BLOCK_AND_VERIFY`
- `triggeredRules[]` — per-rule `severity`, `score`, `reasoning`
- `explanation` — one human-readable sentence

### Rules

| Rule ID             | What It Detects                                          |
|---------------------|----------------------------------------------------------|
| RAPID_FIRE          | Too many requests from one IP in the sliding window      |
| PAYLOAD_ANOMALY     | Transaction amount is a z-score outlier vs. rolling mean |
| TIME_BASED          | High-value transaction outside 09:00–21:00 window        |
| SEQUENTIAL_PATTERN  | Identical payload hash repeated within time window       |
| CREDENTIAL_STUFFING | Multiple distinct userIds from the same IP               |
| BURST_TRANSFER      | Rapid payments from same user to same recipient          |
| VELOCITY_SPIKE      | Sudden acceleration vs. EMA baseline per IP              |

Every rule can be individually enabled/disabled and weighted via environment variables (see `.env.example`).

---

## Authentication (Optional)

JWT authentication is **disabled by default**. To enable:

1. Set `JWT_SECRET` in `.env`
2. Set `REQUIRE_AUTH=true`
3. Obtain a token: `POST /api/auth/token { "username": "admin", "password": "any" }`
4. Pass header: `Authorization: Bearer <token>`

---

## Environment Variables

Copy `.env.example` to `.env`. Key variables:

```env
NODE_ENV=development
JWT_SECRET=                    # empty = auth disabled
REQUIRE_AUTH=false
FRAUD_HIGH_RISK_THRESHOLD=70   # block requests at or above this score
FRAUD_RAPID_FIRE_COUNT=20      # requests in window before RAPID_FIRE fires
RATE_LIMIT_MAX_REQUESTS=120    # per IP per minute
LOG_PRETTY=true                # false = JSON (production)
```

All rule weights and thresholds are individually configurable — see `.env.example`.

---

## Dashboard Features

- **Service Status** — live health badge per service (polls every 10 s)
- **Metrics Cards** — total, blocked, average risk score, average latency, uptime
- **Traffic Timeline** — 15-minute line chart (normal / suspicious / high-risk per minute)
- **Risk Score Histogram** — distribution across 10-point score buckets
- **Fraud Rules Chart** — all 7 rules, trigger counts
- **Risk Level Doughnut** — proportional risk breakdown
- **Live Request Stream** — filterable, clickable log with confidence scores
- **Risk Analysis & Insights** — auto-generated threat alerts with drill-down
- **Demo Scenarios** — 7 pre-built attack simulations

---

## Project Structure

```
├── backend/
│   ├── fraud-service/
│   │   ├── engine.js          FraudDetectionEngine — 7 rules, explainability
│   │   └── server.js          Express HTTP service (port 4001)
│   ├── gateway/
│   │   ├── server.js          API gateway (port 4000)
│   │   └── swagger.js         OpenAPI 3.0 specification
│   ├── services/
│   │   ├── payment-service.js      (port 3001)
│   │   ├── account-service.js      (port 3002)
│   │   └── verification-service.js (port 3003)
│   └── shared/
│       ├── config.js          Central env-driven configuration
│       ├── db.js              JSON file repository (atomic writes)
│       ├── logger.js          Pino logger factory
│       ├── rateLimiter.js     Sliding-window rate limiter
│       └── validators.js      Zod request schemas
├── frontend/                  React + Vite + Tailwind dashboard
├── docker-compose.yml
├── Dockerfile.gateway / .fraud / .services / .frontend
├── .env.example
└── start.js                   Node process orchestrator
```

---

## Production Notes

- **Persistence**: JSON file repository in `./data/`. For production, replace `backend/shared/db.js` with a PostgreSQL or SQLite driver — the repository interface is identical.
- **Rate Limiting**: In-memory sliding window. For horizontal scaling, swap the store in `rateLimiter.js` with Redis (ioredis).
- **Fraud Engine**: Fully rule-based. All scoring is deterministic and auditable. No machine learning.
