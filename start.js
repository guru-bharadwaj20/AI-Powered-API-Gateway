const { spawn } = require('child_process');
const http = require('http');

const QUIET = process.env.SAFEROUTE_QUIET === '1';

const services = [
    { name: 'Payment Service', script: 'backend/services/payment-service.js', port: 3001 },
    { name: 'Account Service', script: 'backend/services/account-service.js', port: 3002 },
    { name: 'Verification Service', script: 'backend/services/verification-service.js', port: 3003 },
    { name: 'API Gateway', script: 'backend/gateway/server.js', port: 4000 }
];

const processes = [];

function checkPort(port) {
    return new Promise((resolve) => {
        const options = {
            host: 'localhost',
            port: port,
            path: '/health',
            timeout: 2000
        };

        const req = http.get(options, (res) => {
            resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
    });
}

async function startService(service) {
    return new Promise((resolve) => {
        if (!QUIET) {
            console.log(`\n🚀 Starting ${service.name}...`);
        }
        
        const proc = spawn('node', [service.script], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        proc.stdout.on('data', (data) => {
            const lines = data.toString().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            for (const line of lines) {
                if (QUIET) {
                    if (/running on port\s+\d+/i.test(line)) {
                        console.log(line);
                    }
                    continue;
                }

                console.log(`   ${service.name}: ${line}`);
            }
        });

        proc.stderr.on('data', (data) => {
            const error = data.toString().trim();
            if (QUIET) {
                return;
            }
            if (error && !error.includes('ExperimentalWarning')) {
                console.error(`   ${service.name} Error: ${error}`);
            }
        });

        proc.on('error', (error) => {
            console.error(`   ❌ ${service.name} failed to start: ${error.message}`);
        });

        processes.push(proc);

        setTimeout(async () => {
            const isRunning = await checkPort(service.port);
            if (!QUIET) {
                if (isRunning) {
                    console.log(`   ✅ ${service.name} is running on port ${service.port}`);
                } else {
                    console.log(`   ⏳ ${service.name} starting on port ${service.port}...`);
                }
            }
            resolve();
        }, 1500);
    });
}

async function startAllServices() {
    if (!QUIET) {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║         SafeRoute AI - Intelligent API Gateway            ║');
        console.log('║              Starting All Services...                      ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
    }

    for (const service of services) {
        await startService(service);
    }

    if (!QUIET) {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║                  🎉 ALL SERVICES STARTED!                  ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n📊 Frontend:  http://localhost:3000');
        console.log('🔌 Gateway:   http://localhost:4000');
        console.log('📈 Metrics:   http://localhost:4000/metrics');
        console.log('📋 Logs:      http://localhost:4000/logs');
        console.log('\n💡 The dashboard will open automatically in your browser...\n');
    }

    setTimeout(() => {
        const open = require('child_process').exec;
        const url = 'http://localhost:3000';
        
        const platform = process.platform;
        let command;
        
        if (platform === 'darwin') {
            command = `open ${url}`;
        } else if (platform === 'win32') {
            command = `start ${url}`;
        } else {
            command = `xdg-open ${url}`;
        }
        
        open(command, (error) => {
            if (error) {
                if (!QUIET) {
                    console.log('⚠️  Please open http://localhost:3000 manually in your browser');
                }
            } else {
                if (QUIET) {
                    console.log('Browser opened successfully!');
                } else {
                    console.log('✅ Browser opened automatically!');
                }
            }
        });
    }, 2000);
}

function cleanup() {
    if (!QUIET) {
        console.log('\n\n🛑 Shutting down all services...');
    }
    processes.forEach(proc => {
        try {
            proc.kill();
        } catch (e) {
            // Ignore errors during cleanup
        }
    });
    process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

startAllServices().catch(error => {
    console.error('❌ Failed to start services:', error);
    cleanup();
});

// Made with Bob
