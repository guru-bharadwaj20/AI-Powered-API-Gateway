# Changelog

All notable changes to this project are documented here.

---

## [2.0.0] — 2026-06-21

### Bug Fixes
- Removed broken `/api/test` gateway endpoint that proxied to wrong port (3000 = frontend)
- Fixed `req.connection.remoteAddress` (deprecated Node.js API) → `req.socket.remoteAddress` with `x-forwarded-for` fallback
- Fixed sequential pattern rule false positives on GET requests (identical empty `{}` body was hashing the same for every GET after 3 calls)
- Fixed divide-by-zero in z-score calculation when `stdDev === 0`
- Fixed missing `Content-Length` header in `forwardRequest()` causing malformed upstream requests
- Fixed `tailwind.config.js` content paths referencing non-existent `./public/index.html`
- Fixed invalid PostCSS: `@import` inside `@layer base {}` — moved Google Fonts to HTML `<head>`
- Removed `react-chartjs-2` (unused import causing runtime error); moved `chart.js` from devDependencies to dependencies
- Fixed `forwardRequest` not propagating request timeout — added `timeout: 8000` option

### Backend

- **Shared config** (`backend/shared/config.js`) — central env-driven configuration for all services; all thresholds, ports, secrets, and feature flags read from environment variables with safe defaults
- **Structured logging** (`backend/shared/logger.js`) — Pino logger factory; JSON in production, coloured pino-pretty in development
- **JSON file repository** (`backend/shared/db.js`) — lightweight pure-JS persistence with atomic tmp+rename writes, `requests`, `fraudEvents`, and `metricsSnapshots` singletons, `riskHistogram()`, `timeline()`, `endpointCounts()` aggregation helpers
- **Zod validators** (`backend/shared/validators.js`) — schemas for all five request bodies; `validate()` middleware factory returning structured 400 errors
- **Rate limiter** (`backend/shared/rateLimiter.js`) — sliding-window in-memory rate limiter, Redis-ready interface, auto-prunes stale keys every 60 s
- Removed `body-parser` (deprecated) from all services — using `express.json()` throughout
- Removed `console.log` from all service startup — replaced with Pino structured logging
- Gateway now returns `X-Risk-Score`, `X-Risk-Level`, `X-Risk-Confidence` headers on every request
- All gateway responses include `riskScore`, `riskLevel` in body
- Gateway stores every request in JSON db; blocked requests also written to `fraudEvents` db
- `POST /api/reset-metrics` now calls `POST /fraud-service/reset` to clear engine state too

### Fraud Engine

- **Standalone microservice** (`backend/fraud-service/server.js`, `backend/fraud-service/engine.js`) — runs on port 4001, decoupled from gateway
- **Honest naming** — removed all "AI-powered" / "ML" / "artificial intelligence" marketing language; renamed to "Explainable Fraud Detection Engine" and "Rule-Based Risk Scoring"
- **7 rules** (up from 4):
  - RAPID_FIRE (existing, enhanced with 3-tier severity)
  - PAYLOAD_ANOMALY (existing, rolling z-score with configurable thresholds)
  - TIME_BASED (existing)
  - SEQUENTIAL_PATTERN (existing, fixed false positive on GET requests)
  - CREDENTIAL_STUFFING (NEW) — multiple distinct userIds from single IP
  - BURST_TRANSFER (NEW) — rapid payments to same recipient
  - VELOCITY_SPIKE (NEW) — EMA-based acceleration vs. IP baseline
- **Confidence scoring** — independent `confidence` (0–1) derived from triggered rule count and individual rule confidence values
- **Structured explainability** — `triggeredRules[]` with per-rule `ruleId`, `ruleName`, `severity`, `score`, `reasoning`; `explanation` field with one human-readable sentence
- **Configurable weights** — every rule's `enabled` flag and `weight` are env-var driven
- **Fallback behaviour** — gateway falls back to `ALLOW_NORMAL` if fraud service is unreachable (no hard dependency)
- Renamed `aiDecision` → `riskDecision` throughout all code and API responses

### Architecture

- **Standalone fraud microservice** on port 4001 (separate process, HTTP interface)
- Gateway calls `POST http://localhost:4001/analyze` with 3000 ms timeout
- All services share `backend/shared/` utilities (config, logger, validators, db, rateLimiter)
- `start.js` updated to orchestrate 5 services in dependency order (Payment → Account → Verification → Fraud → Gateway)
- Optional JWT authentication middleware — disabled by default; enabled with `REQUIRE_AUTH=true` and `JWT_SECRET`
- `POST /api/auth/token` issues signed JWTs with role support (`admin` / `analyst`)

### Frontend / Dashboard

- Renamed "SafeRoute AI" → "API Gateway" in header branding
- Renamed "Intelligent API Gateway" → "Fraud Detection Dashboard"
- Renamed "AI Analysis & Insights" → "Risk Analysis & Insights"
- Renamed "AI Risk Assessment" → "Risk Assessment" in detail modal
- Fixed all `log.aiDecision` references → `log.riskDecision` (with legacy fallback for backward compat)
- Updated `useMetrics` hook: added `timeline` state, fetches `/logs/timeline` every 5 s, normalises `fraud.triggeredRules` vs legacy `ai.triggeredRules`
- `ChartsSection` now renders 4 charts (up from 2):
  - Traffic Timeline (15-minute line chart, minute-by-minute normal/suspicious/high-risk)
  - Risk Score Histogram (10-point buckets, colour-coded by risk level)
  - Fraud Rules Chart (all 7 rules)
  - Risk Level Doughnut
- `ScenarioButtons` — 7 demo scenarios (up from 5):
  - Normal Transaction
  - Rapid Fire Attack (25 req @ 100ms)
  - High-Value Anomaly (z-score, seeds 14 baseline transactions first)
  - Credential Stuffing (NEW — 8 distinct userIds via `/api/verify/identity`)
  - Replay Attack (NEW — same payload 8×)
  - Burst Transfer (NEW — 6 rapid payments to same recipient)
  - Combined Threat (rapid fire + high value + sequential)
- `LogsSection` — shows confidence percentage next to risk score; uses `riskDecision` with fallback
- `AnalysisSection` — alerts for CREDENTIAL_STUFFING, BURST_TRANSFER, SEQUENTIAL_PATTERN rules; all button actions fixed
- `DetailModal` — "AI Risk Assessment" section renamed to "Risk Assessment"; shows `confidence` field; supports `riskDecision` and legacy `aiDecision`

### Performance

- Latency percentiles (P50, P95, P99) tracked in gateway and exposed via `/metrics` and `/metrics/prometheus`
- Fraud service exposes `/stats` with latency percentiles and per-rule hit counts
- `refreshTimeline` polling on a separate 5 s interval (not tied to 2 s metrics refresh) to reduce API load

### Security

- Zod validation on all POST/PUT endpoints — unknown fields are stripped; structured 400 responses
- Rate limiting headers returned on every `/api/*` request: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- JWT secret never logged; fraud service has no outbound internet access requirement
- PII masking in verification service — document numbers are masked before storage

### Documentation

- **README.md** — completely rewritten: architecture diagram, tech stack table, all API routes, fraud rules table, environment variables, project structure, production notes
- **CHANGELOG.md** — this file
- **OpenAPI 3.0** spec at `/api-docs` covering all 17 endpoints with request/response schemas
- **`.env.example`** — documents every environment variable with description and default

### Dependencies

**Added:**
- `pino` — structured JSON logging
- `pino-pretty` (dev) — coloured dev log output
- `zod` — request body schema validation
- `jsonwebtoken` — optional JWT auth
- `swagger-ui-express` — OpenAPI UI at `/api-docs`
- `concurrently` (dev) — parallel service startup for `npm run dev:backend`

**Removed:**
- `body-parser` — replaced by `express.json()`
- `react-scripts` (CRA) — replaced by Vite 6
- `react-chartjs-2` — unused; using Chart.js directly
- `better-sqlite3` — requires native compilation (VS Build Tools); replaced by JSON repository

### New Files
- `backend/fraud-service/engine.js`
- `backend/fraud-service/server.js`
- `backend/gateway/swagger.js`
- `backend/shared/config.js`
- `backend/shared/db.js`
- `backend/shared/logger.js`
- `backend/shared/rateLimiter.js`
- `backend/shared/validators.js`
- `frontend/vite.config.js`
- `frontend/index.html`
- `Dockerfile.gateway`
- `Dockerfile.fraud`
- `Dockerfile.services`
- `Dockerfile.frontend`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`
- `CHANGELOG.md`

### Deleted Files
- `frontend/README.md` — outdated, wrong ports, non-existent npm scripts
- `backend/ai/fraud-detection.js` — replaced by standalone fraud microservice
