import { spawn } from 'child_process';
import path from 'path';

const servers = [
    { name: 'flight-server', file: 'flight-server.js', port: 3001 },
    { name: 'hotel-server', file: 'hotel-server.js', port: 3002 },
    { name: 'activity-server', file: 'activity-server.js', port: 3003 },
    { name: 'restaurant-server', file: 'restaurant-server.js', port: 3004 },
    { name: 'clustering-server', file: 'clustering-server.js', port: 3005 },
    { name: 'search-server', file: 'search-server.js', port: 3006 },
    { name: 'fallback-server', file: 'fallback-server.js', port: 3007 }
];

console.log('🚀 Starting ALL MCP servers (including search & fallback)...');

const processes = [];

for (const server of servers) {
    console.log(`🔄 Starting ${server.name} on port ${server.port}...`);
    
    const process = spawn('node', ['-r', 'dotenv/config', server.file, server.port.toString()], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
    });
    
    process.stdout.on('data', (data) => {
        console.log(`📝 ${server.name}: ${data.toString().trim()}`);
    });
    
    process.stderr.on('data', (data) => {
        console.error(`❌ ${server.name}: ${data.toString().trim()}`);
    });
    
    process.on('close', (code) => {
        console.log(`⚠️  ${server.name} exited with code ${code}`);
    });
    
    processes.push({ name: server.name, process });
}

// Health check after startup
setTimeout(async () => {
    console.log('\n🔍 Checking server health...');
    
    for (const server of servers) {
        try {
            const response = await fetch(`http://localhost:${server.port}/health`);
            if (response.ok) {
                console.log(`✅ ${server.name} is healthy`);
            } else {
                console.log(`⚠️  ${server.name} responded with status ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${server.name} is not responding: ${error.message}`);
        }
    }
}, 3000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Shutting down all servers...');
    processes.forEach(({ name, process }) => {
        console.log(`⏹️  Stopping ${name}...`);
        process.kill();
    });
    process.exit(0);
});

console.log('✅ All 7 servers started. Press Ctrl+C to stop.');
console.log('📊 Server status will be checked in 3 seconds...');