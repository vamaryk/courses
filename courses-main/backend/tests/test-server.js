import http from 'http';

console.log('Testing if server is running...');

const req = http.get('http://localhost:3001/', (res) => {
  console.log('Status:', res.statusCode);
  if (res.statusCode === 404) {
    console.log('✅ Server is running (404 is expected for root path)');
  }
  res.on('data', () => {});
  res.on('end', () => {
    console.log('✅ Server test completed');
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.log('❌ Server not running:', err.message);
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.log('❌ Request timeout');
  process.exit(1);
});
