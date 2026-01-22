const { spawn } = require('child_process');

function spawnProcess(command, args, options) {
  const child = spawn(command, args, {
    windowsHide: true,
    ...options
  });
  return child;
}

const backend = spawnProcess(
  'node',
  ['start.js'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SAFEROUTE_QUIET: '1',
      NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --no-warnings`.trim()
    },
    stdio: ['ignore', 'pipe', 'inherit']
  }
);

// Forward only backend stdout (start.js already filters what it prints in quiet mode)
backend.stdout.pipe(process.stdout);

// Start the React dev server, but keep it quiet.
const frontend = spawnProcess(
  'npm',
  ['start'],
  {
    cwd: require('path').join(process.cwd(), 'frontend'),
    env: {
      ...process.env,
      BROWSER: 'none'
    },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'ignore', 'ignore']
  }
);

function shutdown() {
  try {
    frontend.kill();
  } catch {}
  try {
    backend.kill();
  } catch {}
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

backend.on('exit', (code) => {
  shutdown();
  process.exit(code ?? 0);
});
