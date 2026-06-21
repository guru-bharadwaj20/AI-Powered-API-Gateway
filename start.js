'use strict';

const { spawn, exec } = require('child_process');
const http = require('http');

const QUIET = process.env.SAFEROUTE_QUIET === '1';

const services = [
  { name: 'Payment Service',      script: 'backend/services/payment-service.js',      port: 3001 },
  { name: 'Account Service',      script: 'backend/services/account-service.js',      port: 3002 },
  { name: 'Verification Service', script: 'backend/services/verification-service.js', port: 3003 },
  { name: 'Fraud Service',        script: 'backend/fraud-service/server.js',          port: 4001 },
  { name: 'API Gateway',          script: 'backend/gateway/server.js',                port: 4000 }
];

const processes = [];

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port, path: '/health', timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

function startService(service) {
  return new Promise((resolve) => {
    if (!QUIET) console.log(`  Starting ${service.name}...`);

    const proc = spawn('node', [service.script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    proc.stdout.on('data', (data) => {
      if (QUIET) return;
      data.toString().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        .forEach(line => console.log(`  [${service.name}] ${line}`));
    });

    proc.stderr.on('data', (data) => {
      if (QUIET) return;
      const msg = data.toString().trim();
      if (msg && !msg.includes('ExperimentalWarning')) {
        console.error(`  [${service.name}] ${msg}`);
      }
    });

    proc.on('error', (err) => {
      console.error(`  FAILED ${service.name}: ${err.message}`);
    });

    processes.push(proc);

    setTimeout(async () => {
      const running = await checkPort(service.port);
      if (!QUIET) {
        const icon = running ? 'OK' : 'pending';
        console.log(`  [${icon.padEnd(7)}] ${service.name} -> port ${service.port}`);
      }
      resolve();
    }, 1800);
  });
}

async function startAllServices() {
  if (!QUIET) {
    console.log('');
    console.log('  API Gateway - Explainable Fraud Detection');
    console.log('  -----------------------------------------');
    console.log('');
  }

  for (const service of services) {
    await startService(service);
  }

  if (!QUIET) {
    console.log('');
    console.log('  ALL SERVICES STARTED');
    console.log('');
    console.log('  Dashboard:      http://localhost:3000');
    console.log('  Gateway API:    http://localhost:4000');
    console.log('  Swagger Docs:   http://localhost:4000/api-docs');
    console.log('  Metrics:        http://localhost:4000/metrics');
    console.log('  Prometheus:     http://localhost:4000/metrics/prometheus');
    console.log('  Fraud Service:  http://localhost:4001');
    console.log('');
  }

  setTimeout(() => {
    const url = 'http://localhost:3000';
    const cmd = process.platform === 'darwin' ? `open ${url}`
              : process.platform === 'win32'  ? `start ${url}`
              : `xdg-open ${url}`;

    exec(cmd, (err) => {
      if (err && !QUIET) console.log('  Open http://localhost:3000 in your browser');
    });
  }, 2500);
}

function cleanup() {
  if (!QUIET) console.log('\n  Shutting down...');
  processes.forEach(p => { try { p.kill(); } catch {} });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', () => processes.forEach(p => { try { p.kill(); } catch {} }));

startAllServices().catch(err => {
  console.error('Failed to start services:', err);
  cleanup();
});
