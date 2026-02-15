import http from 'http';
import querystring from 'querystring';

const postData = querystring.stringify({
  email: 'test@example.com',
  password: 'testpassword123',
  full_name: 'Test User'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Testing signup endpoint...');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response:', JSON.stringify(response, null, 2));
      if (res.statusCode === 201) {
        console.log('✅ Signup successful');
      } else {
        console.log('❌ Signup failed');
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (err) => {
  console.log('❌ Request failed:', err.message);
});

req.write(postData);
req.end();
