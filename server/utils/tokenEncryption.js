const crypto = require('crypto');

// 32-byte encryption key derived from SESSION_SECRET or JWT_SECRET
const getSecretKey = () => {
  const secret = process.env.GITHUB_ENCRYPTION_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET || 'hiremyskills_fallback_encryption_secret_key_32';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypt a plaintext token using AES-256-GCM
 * Returns string format: ivHex:authTagHex:encryptedHex
 */
const encryptToken = (plainText) => {
  if (!plainText || typeof plainText !== 'string') return '';
  try {
    const iv = crypto.randomBytes(12);
    const key = getSecretKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('[TOKEN_ENCRYPT] Failed to encrypt token:', err.message);
    return '';
  }
};

/**
 * Decrypt an AES-256-GCM token
 */
const decryptToken = (encryptedPayload) => {
  if (!encryptedPayload || typeof encryptedPayload !== 'string') return '';
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) return '';

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getSecretKey();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[TOKEN_DECRYPT] Failed to decrypt token:', err.message);
    return '';
  }
};

module.exports = {
  encryptToken,
  decryptToken,
};
