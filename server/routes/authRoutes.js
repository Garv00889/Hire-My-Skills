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

// ─── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  const returnTo = req.query.returnTo || '/home';
  const targetOrigin = getSafeFrontendOrigin(req.query.clientUrl || req.headers.referer);

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('[OAUTH] Google OAuth credentials missing in environment.');
    return res.redirect(`${targetOrigin}/login?error=google_not_configured`);
  }

  const state = generateOAuthState(returnTo, targetOrigin);

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
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const stateData = verifyOAuthState(req.query.state);
  const fallbackOrigin = getSafeFrontendOrigin();
  const targetFrontend = stateData?.clientUrl || fallbackOrigin;
  const returnTo = stateData?.returnTo || '/home';

  if (req.query.error) {
    console.warn('[OAUTH] Google auth error from provider:', req.query.error);
    const errCode = req.query.error === 'access_denied' ? 'google_cancelled' : 'google_failed';
    return res.redirect(`${targetFrontend}/login?error=${errCode}`);
  }

  passport.authenticate('google', { session: false }, (err, user) => {
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

  const state = generateOAuthState(returnTo, targetOrigin);

  res.cookie('hms_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });

  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
    state,
  })(req, res, next);
});

router.get('/github/callback', (req, res, next) => {
  const stateData = verifyOAuthState(req.query.state);
  const fallbackOrigin = getSafeFrontendOrigin();
  const targetFrontend = stateData?.clientUrl || fallbackOrigin;
  const returnTo = stateData?.returnTo || '/home';

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

  passport.authenticate('github', { session: false }, (err, user, info) => {
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
      const reason = encodeURIComponent(err.message || 'auth_error');
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

module.exports = router;

