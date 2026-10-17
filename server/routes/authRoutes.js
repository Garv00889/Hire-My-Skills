const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { register, login, getMe, updateProfile, getUserProfileById } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { generateOAuthState, verifyOAuthState, getSafeFrontendOrigin } = require('../utils/oauthHelper');

// Existing email/password routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users/:userId', protect, getUserProfileById);

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('hms_oauth_state');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Helper to resolve exact matching OAuth callback URLs across dev, test, and production
const getCallbackURL = (req, provider) => {
  // Always prioritize the explicitly configured callback URL in environment,
  // because GitHub strictly validates redirect_uri against the registered callback URL in GitHub Developer Settings.
  if (process.env[`${provider.toUpperCase()}_CALLBACK_URL`]) {
    return process.env[`${provider.toUpperCase()}_CALLBACK_URL`];
  }

  const host = req.get('host');
  // If running locally without GITHUB_CALLBACK_URL, use local host callback URL
  if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    return `${protocol}://${host}/api/auth/${provider}/callback`;
  }

  // Production fallback
  return `https://hire-my-skills.onrender.com/api/auth/${provider}/callback`;
};

// ─── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  const returnTo = req.query.returnTo || '/home';
  const targetOrigin = getSafeFrontendOrigin(req.query.clientUrl || req.headers.referer);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[OAUTH] Google OAuth credentials missing in environment.');
    return res.redirect(`${targetOrigin}/login?error=google_not_configured`);
  }

  const callbackURL = getCallbackURL(req, 'google');
  const state = generateOAuthState(returnTo, targetOrigin, callbackURL);

  res.cookie('hms_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
    callbackURL,
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const stateData = verifyOAuthState(req.query.state);
  const fallbackOrigin = getSafeFrontendOrigin();
  const targetFrontend = stateData?.clientUrl || fallbackOrigin;
  const returnTo = stateData?.returnTo || '/home';
  const callbackURL = stateData?.callbackUrl || getCallbackURL(req, 'google');

  if (req.query.error) {
    console.warn('[OAUTH] Google auth error from provider:', req.query.error);
    const errCode = req.query.error === 'access_denied' ? 'google_cancelled' : 'google_failed';
    return res.redirect(`${targetFrontend}/login?error=${errCode}`);
  }

  if (!stateData) {
    console.error('[OAUTH] Invalid or expired Google OAuth state');
    return res.redirect(`${targetFrontend}/login?error=invalid_state`);
  }

  passport.authenticate('google', { session: false, callbackURL }, (err, user) => {
    if (err) {
      console.error('[OAUTH] Google auth callback error:', err.message);
      if (err.message === 'ACCOUNT_INACTIVE') {
        return res.redirect(`${targetFrontend}/login?error=account_inactive`);
      }
      return res.redirect(`${targetFrontend}/login?error=google_failed`);
    }

    if (!user) {
      return res.redirect(`${targetFrontend}/login?error=google_failed`);
    }

    res.clearCookie('hms_oauth_state');
    const token = user.jwtToken;
    return res.redirect(`${targetFrontend}/login?token=${token}&returnTo=${encodeURIComponent(returnTo)}`);
  })(req, res, next);
});

// ─── GitHub OAuth ──────────────────────────────────────────────────────────────
router.get('/github', (req, res, next) => {
  const returnTo = req.query.returnTo || '/home';
  const targetOrigin = getSafeFrontendOrigin(req.query.clientUrl || req.headers.referer);

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error('[OAUTH] GitHub OAuth credentials missing in environment.');
    return res.redirect(`${targetOrigin}/login?error=github_not_configured`);
  }

  const callbackURL = getCallbackURL(req, 'github');
  const state = generateOAuthState(returnTo, targetOrigin, callbackURL);

  res.cookie('hms_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  // Support full repo scope when connecting from project chat workspace
  const requestedScope = req.query.scope === 'repo'
    ? ['repo', 'user:email']
    : ['user:email', 'repo'];

  passport.authenticate('github', {
    scope: requestedScope,
    session: false,
    state,
    callbackURL,
  })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  const stateData = verifyOAuthState(req.query.state);
  const fallbackOrigin = getSafeFrontendOrigin();
  const targetFrontend = stateData?.clientUrl || fallbackOrigin;
  const returnTo = stateData?.returnTo || '/home';
  const callbackURL = stateData?.callbackUrl || getCallbackURL(req, 'github');

  // Handle provider cancellation or denied access
  if (req.query.error) {
    console.warn('[OAUTH] GitHub auth error from provider:', req.query.error, req.query.error_description);
    const errCode = req.query.error === 'access_denied' ? 'github_cancelled' : 'github_failed';
    return res.redirect(`${targetFrontend}/login?error=${errCode}`);
  }

  // Validate state token to protect against CSRF
  if (!stateData) {
    console.error('[OAUTH] Invalid or expired GitHub OAuth state');
    return res.redirect(`${targetFrontend}/login?error=invalid_state`);
  }

  passport.authenticate('github', { session: false, callbackURL }, (err, user, info) => {
    if (err) {
      console.error('[OAUTH] GitHub passport callback error:', err);
      if (err.oauthError) {
        console.error('[OAUTH] GitHub internal oauthError details:', err.oauthError);
      }
      if (err.message === 'NO_VERIFIED_EMAIL') {
        return res.redirect(`${targetFrontend}/login?error=no_verified_email`);
      }
      if (err.message === 'ACCOUNT_INACTIVE') {
        return res.redirect(`${targetFrontend}/login?error=account_inactive`);
      }

      let detailMsg = err.message || 'auth_error';
      if (err.oauthError?.data) {
        try {
          const parsed = JSON.parse(err.oauthError.data);
          detailMsg = parsed.error_description || parsed.error || err.oauthError.data;
        } catch (e) {
          detailMsg = err.oauthError.data;
        }
      }
      const reason = encodeURIComponent(detailMsg);
      return res.redirect(`${targetFrontend}/login?error=github_failed&message=${reason}`);
    }

    if (!user) {
      const reason = encodeURIComponent((info && (info.message || JSON.stringify(info))) || 'user_not_found');
      return res.redirect(`${targetFrontend}/login?error=github_failed&message=${reason}`);
    }

    res.clearCookie('hms_oauth_state');
    const token = user.jwtToken;
    return res.redirect(`${targetFrontend}/login?token=${token}&returnTo=${encodeURIComponent(returnTo)}`);
  })(req, res, next);
});

// ─── SuperAdmin Bootstrap Endpoint ──────────────────────────────────────────────
router.get('/init-admin', async (req, res) => {
  try {
    const User = require('../models/User');
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@hiremyskills.com').toLowerCase().trim();
    const adminPass = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = await User.create({
        name: 'Super Administrator',
        email: adminEmail,
        password: adminPass,
        role: 'superadmin',
        status: 'active',
        isVerified: true,
      });
    } else {
      admin.role = 'superadmin';
      admin.status = 'active';
      admin.isVerified = true;
      admin.password = adminPass;
      await admin.save();
    }
    return res.json({
      success: true,
      message: `SuperAdmin credentials ready! You can now log in.`,
      email: adminEmail,
      password: adminPass,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

