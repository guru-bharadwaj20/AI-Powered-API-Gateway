'use strict';

/**
 * Lightweight file-backed JSON repository.
 *
 * Production note: replace this with PostgreSQL or SQLite
 * (add `better-sqlite3` once VS Build Tools are available, or run inside
 * Docker where the build environment is pre-configured).
 *
 * Interface is intentionally database-agnostic so a drop-in replacement
 * only requires changing this file.
 */

const fs   = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = path.resolve(config.data.dir);
fs.mkdirSync(DATA_DIR, { recursive: true });

class Repository {
  /**
   * @param {string} name - filename (without .json)
   * @param {number} maxSize - oldest records are pruned beyond this limit
   * @param {number} flushIntervalMs - async flush cadence
   */
  constructor(name, maxSize = 5000, flushIntervalMs = 5000) {
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.maxSize  = maxSize;
    this.records  = [];
    this._dirty   = false;

    this._load();

    // Periodic async flush
    const timer = setInterval(() => this._flush(), flushIntervalMs);
    if (timer.unref) timer.unref();   // don't block process exit

    // Synchronous flush on shutdown
    const shutdown = () => { try { this._flushSync(); } catch {} };
    process.on('exit', shutdown);
    process.on('SIGINT', () => { shutdown(); process.exit(0); });
    process.on('SIGTERM', () => { shutdown(); process.exit(0); });
  }

  /** Insert a record at the front (newest-first ordering). */
  insert(record) {
    const entry = { ...record, _id: Date.now() + Math.random() };
    this.records.unshift(entry);

    if (this.records.length > this.maxSize) {
      this.records.length = this.maxSize;
    }

    this._dirty = true;
    return entry;
  }

  /**
   * Query records.
   * @param {{ limit?: number, where?: (r: object) => boolean }} opts
   */
  find({ limit = 100, where = null } = {}) {
    const src = where ? this.records.filter(where) : this.records;
    return limit > 0 ? src.slice(0, limit) : src;
  }

  count(where = null) {
    return where ? this.records.filter(where).length : this.records.length;
  }

  /** Aggregate risk-score histogram in 10-point buckets. */
  riskHistogram() {
    const buckets = {};
    for (let b = 0; b <= 90; b += 10) buckets[b] = 0;

    for (const r of this.records) {
      if (typeof r.riskScore === 'number') {
        const b = Math.min(90, Math.floor(r.riskScore / 10) * 10);
        buckets[b]++;
      }
    }
    return buckets;
  }

  /**
   * Time-bucketed counts for the last `minutes` minutes, one entry per minute.
   * Returns array of { minute, normal, suspicious, highRisk, total }.
   */
  timeline(minutes = 10) {
    const now = Date.now();
    const buckets = [];

    for (let i = minutes - 1; i >= 0; i--) {
      const start = now - (i + 1) * 60_000;
      const end   = now - i * 60_000;
      const label = new Date(end).toISOString().slice(11, 16); // HH:MM

      const slice = this.records.filter(r => {
        const t = new Date(r.timestamp).getTime();
        return t >= start && t < end;
      });

      buckets.push({
        minute:     label,
        normal:     slice.filter(r => r.riskLevel === 'NORMAL').length,
        suspicious: slice.filter(r => r.riskLevel === 'SUSPICIOUS').length,
        highRisk:   slice.filter(r => r.riskLevel === 'HIGH_RISK').length,
        total:      slice.length
      });
    }

    return buckets;
  }

  /** Counts per endpoint from stored records. */
  endpointCounts() {
    const counts = {};
    for (const r of this.records) {
      if (r.endpoint) counts[r.endpoint] = (counts[r.endpoint] || 0) + 1;
    }
    return counts;
  }

  clear() {
    this.records  = [];
    this._dirty   = true;
    this._flushSync();
  }

  // ── internal ──────────────────────────────────────────────────────────────

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.records = Array.isArray(parsed) ? parsed : [];
    } catch {
      this.records = [];
    }
  }

  _flush() {
    if (!this._dirty) return;
    try {
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.records));
      fs.renameSync(tmp, this.filePath);
      this._dirty = false;
    } catch (err) {
      // non-fatal — will retry next interval
    }
  }

  _flushSync() {
    if (!this._dirty) return;
    try {
      const tmp = this.filePath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.records));
      fs.renameSync(tmp, this.filePath);
      this._dirty = false;
    } catch {}
  }
}

// ── singleton repositories ────────────────────────────────────────────────

const requestsRepo = new Repository(
  'requests',
  config.data.maxRequestLogs
);

const fraudEventsRepo = new Repository(
  'fraud_events',
  config.data.maxFraudEvents
);

const metricsSnapshotsRepo = new Repository(
  'metrics_snapshots',
  config.data.maxMetricSnapshots
);

module.exports = {
  requests:        requestsRepo,
  fraudEvents:     fraudEventsRepo,
  metricsSnapshots: metricsSnapshotsRepo,
  /** Hard-reset all repositories (dev/test use only). */
  reset() {
    requestsRepo.clear();
    fraudEventsRepo.clear();
    metricsSnapshotsRepo.clear();
  }
};
