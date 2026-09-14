const http = require('http');

function req(options, body) {
  return new Promise((resolve) => {
    const r = http.request(options, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, data: d }); }
      });
    });
    r.on('error', (err) => resolve({ status: 0, data: err.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function verifyAll() {
  const base = { hostname: 'localhost', port: 5000, headers: { 'Content-Type': 'application/json' } };
  console.log('========================================================');
  console.log('BEGINNING 15-POINT AUTHENTICATION FORENSIC VERIFICATION');
  console.log('========================================================');

  const testEmailRaw = '  PermanentTest@Domain.COM  ';
  const testEmailNorm = 'permanenttest@domain.com';
  const testPassword = 'Password123!@#';

  // 1. Registration with mixed-case and whitespace email
  const r1 = await req({ ...base, path: '/api/auth/register', method: 'POST' }, {
    name: '  Permanent Test User  ',
    email: testEmailRaw,
    password: testPassword,
  });
  console.log('Step 1: Registration with raw email: status ' + r1.status + (r1.status === 201 ? ' PASS' : ' FAIL'));
  console.log('  Normalized Email returned: ' + r1.data.email);

  // 2 & 3. MongoDB direct check
  const mongoose = require('mongoose');
  await mongoose.connect('mongodb://127.0.0.1:27017/hiremyskills');
  const userInDb = await mongoose.connection.db.collection('users').findOne({ email: testEmailNorm });
  console.log('Step 2: Found in MongoDB: ' + (userInDb ? 'PASS' : 'FAIL'));
  console.log('  Stored Email: ' + (userInDb ? userInDb.email : 'N/A'));
  console.log('  Stored Name: ' + (userInDb ? userInDb.name : 'N/A'));

  const isHashed = userInDb && typeof userInDb.password === 'string' && (userInDb.password.startsWith('$2a$') || userInDb.password.startsWith('$2b$'));
  console.log('Step 3: Password is valid bcrypt hash: ' + (isHashed ? 'PASS' : 'FAIL'));
  console.log('  Plaintext password NOT stored: ' + (userInDb && userInDb.password !== testPassword ? 'PASS' : 'FAIL'));

  // 4. Login with exact normalized email
  const r4 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, {
    email: testEmailNorm,
    password: testPassword,
  });
  console.log('Step 4: Login with exact email: status ' + r4.status + (r4.status === 200 ? ' PASS' : ' FAIL'));
  const token = r4.data.token;

  // 5. Login with whitespace and uppercase email
  const r5 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, {
    email: '   PERMANENTTEST@DOMAIN.COM   ',
    password: testPassword,
  });
  console.log('Step 5: Login with uppercase and spaces: status ' + r5.status + (r5.status === 200 ? ' PASS' : ' FAIL'));

  // 6. Token format check
  const parts = (token || '').split('.');
  console.log('Step 6: JWT Token format: ' + (parts.length === 3 ? 'PASS (3 parts)' : 'FAIL'));

  // 7. Protected route verification
  const r7 = await req({ ...base, path: '/api/auth/me', method: 'GET', headers: { ...base.headers, Authorization: 'Bearer ' + token } });
  console.log('Step 7: Protected Route (/api/auth/me): status ' + r7.status + (r7.status === 200 && r7.data.email === testEmailNorm ? ' PASS' : ' FAIL'));

  // 8. Wrong password test
  const r8 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, {
    email: testEmailNorm,
    password: 'WrongPassword999!',
  });
  console.log('Step 8: Wrong Password: status ' + r8.status + (r8.status === 401 ? ' PASS (401)' : ' FAIL'));

  // 9. Non-existent user test
  const r9 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, {
    email: 'nonexistent_user_9999@test.com',
    password: testPassword,
  });
  console.log('Step 9: Non-existent User: status ' + r9.status + (r9.status === 401 ? ' PASS (401)' : ' FAIL'));

  // 10 & 11. Missing credentials validation
  const r10 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, { email: testEmailNorm, password: '' });
  const r11 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, { email: '', password: testPassword });
  console.log('Step 10: Empty password rejected: status ' + r10.status + (r10.status === 400 ? ' PASS (400)' : ' FAIL'));
  console.log('Step 11: Empty email rejected: status ' + r11.status + (r11.status === 400 ? ' PASS (400)' : ' FAIL'));

  // 12. Duplicate registration rejection
  const r12 = await req({ ...base, path: '/api/auth/register', method: 'POST' }, {
    name: 'Duplicate Guy',
    email: testEmailNorm,
    password: 'AnotherPassword123!',
  });
  console.log('Step 12: Duplicate Registration: status ' + r12.status + (r12.status === 400 ? ' PASS (400)' : ' FAIL'));

  // 13. Invalid/tampered token rejection
  const r13 = await req({ ...base, path: '/api/auth/me', method: 'GET', headers: { ...base.headers, Authorization: 'Bearer fake.invalid.token' } });
  console.log('Step 13: Invalid Token: status ' + r13.status + (r13.status === 401 ? ' PASS (401)' : ' FAIL'));

  // 14 & 15. Profile update and subsequent login
  const r14 = await req({ ...base, path: '/api/auth/profile', method: 'PUT', headers: { ...base.headers, Authorization: 'Bearer ' + token } }, {
    bio: 'Updated bio testing password preservation',
    tagline: 'Senior Engineer',
  });
  console.log('Step 14: Profile Update: status ' + r14.status + (r14.status === 200 ? ' PASS' : ' FAIL'));

  const r15 = await req({ ...base, path: '/api/auth/login', method: 'POST' }, {
    email: testEmailNorm,
    password: testPassword,
  });
  console.log('Step 15: Login After Profile Update: status ' + r15.status + (r15.status === 200 ? ' PASS (Password preserved)' : ' FAIL'));

  // Cleanup
  await mongoose.connection.db.collection('users').deleteOne({ email: testEmailNorm });
  await mongoose.disconnect();
  console.log('========================================================');
  console.log('ALL 15 TESTS COMPLETED - CLEANUP DONE');
  console.log('========================================================');
}

verifyAll().catch(console.error);
