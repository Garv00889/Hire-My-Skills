const { encryptToken, decryptToken } = require('../utils/tokenEncryption');

function runTests() {
  console.log('--- Testing Token Encryption & Decryption ---');
  const sampleToken = 'ghp_SampleTestToken1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptToken(sampleToken);
  console.log('Encrypted:', encrypted);

  if (!encrypted || !encrypted.includes(':')) {
    console.error('FAIL: Encryption did not produce expected iv:authTag:cipher format');
    process.exit(1);
  }

  const decrypted = decryptToken(encrypted);
  console.log('Decrypted matches:', decrypted === sampleToken);

  if (decrypted !== sampleToken) {
    console.error('FAIL: Decrypted token does not match original plaintext');
    process.exit(1);
  }

  console.log('PASS: Token encryption & decryption verified successfully.');
}

runTests();
