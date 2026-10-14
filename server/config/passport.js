const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token (same helper pattern as authController)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─── Google OAuth Strategy ──────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://hire-my-skills.onrender.com/api/auth/google/callback',
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
          if (user.status === 'suspended' || user.status === 'banned') {
            return done(new Error('ACCOUNT_INACTIVE'), null);
          }

          let changed = false;
          // Update googleId if this is an existing user linking for the first time
          if (!user.googleId) {
            user.googleId = googleId;
            changed = true;
          }
          // Update profile picture if they don't have one
          if (!user.profilePicture && profilePicture) {
            user.profilePicture = profilePicture;
            changed = true;
          }
          if (!user.isVerified) {
            user.isVerified = true;
            changed = true;
          }
          user.lastLogin = new Date();
          if (changed) {
            await user.save();
          } else {
            await User.updateOne({ _id: user._id }, { lastLogin: new Date() });
          }
        } else {
          // 3. Brand new user — create account
          user = await User.create({
            name,
            email,
            googleId,
            profilePicture: profilePicture || '',
            role: 'student',
            status: 'active',
            isVerified: true,
            lastLogin: new Date(),
          });
        }

        // Generate JWT for this user
        const token = generateToken(user._id);
        user.jwtToken = token;

        console.log(`[OAUTH] Google login success for: ${user.email} (${user._id})`);
        return done(null, user);
      } catch (error) {
        console.error('[OAUTH] Google strategy error:', error.message);
        return done(error, null);
      }
    }
  ));
} else {
  console.warn('[OAUTH] Google OAuth disabled: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
}

// ─── GitHub OAuth Strategy ──────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://hire-my-skills.onrender.com/api/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
      try {
        const githubId = String(profile.id);
        let email = profile.emails?.[0]?.value?.toLowerCase().trim();

        // If email wasn't included directly in profile (e.g. private email setting), fetch from GitHub user emails API
        if (!email && accessToken) {
          try {
            const emailRes = await fetch('https://api.github.com/user/emails', {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'HireMySkills-OAuth-App',
                'Accept': 'application/vnd.github.v3+json',
              },
            });
            if (emailRes.ok) {
              const emailsData = await emailRes.json();
              if (Array.isArray(emailsData) && emailsData.length > 0) {
                // Find primary & verified email first, or any verified email
                const primaryVerified = emailsData.find((e) => e.primary && e.verified);
                const anyVerified = emailsData.find((e) => e.verified);
                const selected = primaryVerified || anyVerified || emailsData[0];
                if (selected?.email) {
                  email = selected.email.toLowerCase().trim();
                }
              }
            } else {
              console.warn('[OAUTH] GitHub emails API returned status:', emailRes.status);
            }
          } catch (fetchErr) {
            console.error('[OAUTH] Error querying GitHub private emails:', fetchErr.message);
          }
        }

        if (!email) {
          return done(new Error('NO_VERIFIED_EMAIL'), null);
        }

        const name = profile.displayName || profile.username || 'GitHub User';
        const profilePicture = profile.photos?.[0]?.value || profile._json?.avatar_url || '';
        const githubLink = profile.profileUrl || (profile.username ? `https://github.com/${profile.username}` : '');

        // 1. Try to find existing user by githubId
        let user = await User.findOne({ githubId });

        // 2. Not found by githubId — try matching verified email (links existing email/password or Google user)
        if (!user) {
          user = await User.findOne({ email });
        }

        if (user) {
          if (user.status === 'suspended' || user.status === 'banned') {
            return done(new Error('ACCOUNT_INACTIVE'), null);
          }

          let changed = false;
          if (!user.githubId) {
            user.githubId = githubId;
            changed = true;
          }
          if (!user.githubLink && githubLink) {
            user.githubLink = githubLink;
            if (!user.socialLinks) user.socialLinks = {};
            user.socialLinks.github = githubLink;
            changed = true;
          }
          if (!user.profilePicture && profilePicture) {
            user.profilePicture = profilePicture;
            changed = true;
          }
          if (!user.isVerified) {
            user.isVerified = true;
            changed = true;
          }
          user.lastLogin = new Date();
          if (changed) {
            await user.save();
          } else {
            await User.updateOne({ _id: user._id }, { lastLogin: new Date() });
          }
        } else {
          // 3. Brand new user registration via GitHub
          user = await User.create({
            name,
            email,
            githubId,
            githubLink,
            socialLinks: { github: githubLink },
            profilePicture: profilePicture || '',
            role: 'student', // Never grant admin privileges via OAuth
            status: 'active',
            isVerified: true,
            lastLogin: new Date(),
          });
        }

        // Generate JWT token
        const token = generateToken(user._id);
        user.jwtToken = token;

        console.log(`[OAUTH] GitHub login success for: ${user.email} (${user._id})`);
        return done(null, user);
      } catch (error) {
        console.error('[OAUTH] GitHub strategy error:', error.message);
        return done(error, null);
      }
    }
  ));
} else {
  console.warn('[OAUTH] GitHub OAuth disabled: Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
}

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
