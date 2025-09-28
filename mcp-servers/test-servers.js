// Quick test to see if search-server and fallback-server can start
import { spawn } from 'child_process';

console.log('🧪 Testing search-server and fallback-server...');

// Test search-server
console.log('Testing search-server...');
const searchServer = spawn('node', ['search-server.js', '3006'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

searchServer.stdout.on('data', (data) => {
    console.log(`✅ search-server: ${data.toString().trim()}`);
});

searchServer.stderr.on('data', (data) => {
    console.error(`❌ search-server error: ${data.toString().trim()}`);
});

// Test fallback-server
console.log('Testing fallback-server...');
const fallbackServer = spawn('node', ['fallback-server.js', '3007'], {
    stdio: ['pipe', 'pipe', 'pipe']
});

fallbackServer.stdout.on('data', (data) => {
    console.log(`✅ fallback-server: ${data.toString().trim()}`);
});

fallbackServer.stderr.on('data', (data) => {
    console.error(`❌ fallback-server error: ${data.toString().trim()}`);
});

// Stop after 3 seconds
setTimeout(() => {
    console.log('🔄 Stopping test servers...');
    searchServer.kill();
    fallbackServer.kill();
    process.exit(0);
}, 3000);