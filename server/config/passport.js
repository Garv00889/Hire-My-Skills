const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token (same helper pattern as authController)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value?.toLowerCase().trim();
        const name = profile.displayName;
        const profilePicture = profile.photos?.[0]?.value;

        if (!email) {
          return done(new Error('No email returned from Google'), null);
        }

        // 1. Try to find existing user by googleId
        let user = await User.findOne({ googleId });

        // 2. Not found by googleId — try email (links existing email/password account)
        if (!user) {
          user = await User.findOne({ email });
        }

        if (user) {
          // Update googleId if this is an existing email/password user linking for the first time
          if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
          }
          // Update profile picture if they don't have one
          if (!user.profilePicture && profilePicture) {
            user.profilePicture = profilePicture;
            await user.save();
          }
        } else {
          // 3. Brand new user — create account
          user = await User.create({
            name,
            email,
            googleId,
            profilePicture: profilePicture || '',
            // No password — this is an OAuth-only account
          });
        }

        // Generate JWT for this user
        const token = generateToken(user._id);

        // Attach token to user object so the callback route can use it
        user.jwtToken = token;

        console.log(`[OAUTH] Google login success for: ${user.email} (${user._id})`);
        return done(null, user);
      } catch (error) {
        console.error('[OAUTH] Google strategy error:', error.message);
        return done(error, null);
      }
    }
  )
);

// Passport session serialize/deserialize (minimal — we use JWT, not sessions)
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (e) {
    done(e, null);
  }
});

module.exports = passport;
