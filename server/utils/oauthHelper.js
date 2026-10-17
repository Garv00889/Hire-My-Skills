const crypto = require('crypto');

// Allowed frontend origins for OAuth redirects
const DEFAULT_ALLOWED_ORIGINS = [
  'https://hire-my-skills.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const isAllowedOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname;
    const protocol = parsed.protocol;

    if (protocol !== 'http:' && protocol !== 'https:') return false;

    // Localhost or loopback on any port for local development
    if (host === 'localhost' || host === '127.0.0.1') return true;

    // Official production Vercel domain & preview builds
    if (host === 'hire-my-skills.vercel.app') return true;
    if (host.endsWith('.vercel.app') && (host.startsWith('hire-my-skills') || host.startsWith('hiremyskills'))) {
      return true;
    }

    // Configured environment variables
    const custom = [process.env.FRONTEND_URL, process.env.CLIENT_URL].filter(Boolean);
    for (const c of custom) {
      try {
        if (new URL(c).origin === parsed.origin) return true;
      } catch (_) {}
    }

    return false;
  } catch (e) {
    return false;
  }
};

const getAllowedOrigins = () => {
  const list = [...DEFAULT_ALLOWED_ORIGINS];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  if (process.env.CLIENT_URL) list.push(process.env.CLIENT_URL.replace(/\/$/, ''));
  return [...new Set(list)];
};

/**
 * Validates and normalizes target origin
 */
const getSafeFrontendOrigin = (requestedOrigin) => {
  if (requestedOrigin) {
    try {
      const parsed = new URL(requestedOrigin);
      const origin = parsed.origin;
      if (isAllowedOrigin(origin)) {
        return origin;
      }
    } catch (e) {
      // Invalid URL syntax
    }
  }
  return process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://hire-my-skills.vercel.app';
};

/**
 * Validates internal returnTo path to prevent open redirects (e.g. //evil.com or javascript:)
 */
const sanitizeReturnTo = (path) => {
  if (!path || typeof path !== 'string') return '/home';
  const trimmed = path.trim();
  // Must start with single / and not //
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('\\')) {
    return trimmed;
  }
  return '/home';
};

/**
 * Generates cryptographically signed OAuth state
 */
const generateOAuthState = (returnTo, requestedOrigin, callbackUrl = null) => {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'hms_oauth_secret_fallback_key';
  const clientUrl = getSafeFrontendOrigin(requestedOrigin);
  const safeReturnTo = sanitizeReturnTo(returnTo);

  const payload = {
    nonce: crypto.randomBytes(16).toString('hex'),
    returnTo: safeReturnTo,
    clientUrl,
    callbackUrl: callbackUrl || null,
    iat: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');

  return `${payloadStr}.${signature}`;
};

/**
 * Verifies signed OAuth state
 */
const verifyOAuthState = (stateStr) => {
  if (!stateStr || typeof stateStr !== 'string') return null;

  const parts = stateStr.split('.');
  if (parts.length !== 2) return null;

  const [payloadStr, signature] = parts;
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'hms_oauth_secret_fallback_key';

  try {
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));

    // Check expiration: 15 minutes max
    if (Date.now() - payload.iat > 15 * 60 * 1000) {
      return null;
    }

    return {
      returnTo: sanitizeReturnTo(payload.returnTo),
      clientUrl: getSafeFrontendOrigin(payload.clientUrl),
      callbackUrl: payload.callbackUrl || null,
      nonce: payload.nonce,
    };
  } catch (err) {
    return null;
  }
};

module.exports = {
  isAllowedOrigin,
  getAllowedOrigins,
  getSafeFrontendOrigin,
  sanitizeReturnTo,
  generateOAuthState,
  verifyOAuthState,
};
