const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { register, login, getMe, updateProfile, getUserProfileById } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Existing email/password routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/users/:userId', protect, getUserProfileById);

// ─── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: Redirect user to Google consent screen
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Step 2: Google redirects back here after user approves
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`,
  }),
  (req, res) => {
    // req.user.jwtToken was set by the passport strategy
    const token = req.user.jwtToken;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/login?token=${token}`);
  }
);

module.exports = router;

