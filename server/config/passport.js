const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { encryptToken } = require('../utils/tokenEncryption');

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

          const updateFields = {
            lastLogin: new Date(),
          };
          if (!user.googleId) updateFields.googleId = googleId;
          if (!user.profilePicture && profilePicture) updateFields.profilePicture = profilePicture;
          if (!user.isVerified) updateFields.isVerified = true;

          user = await User.findByIdAndUpdate(user._id, { $set: updateFields }, { new: true });
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
  const githubStrategy = new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://hire-my-skills.onrender.com/api/auth/github/callback',
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const githubId = String(profile.id);
        let email = null;

        // 1. Check profile.emails array (primary & verified first)
        if (Array.isArray(profile.emails) && profile.emails.length > 0) {
          const primaryVerified = profile.emails.find((e) => e.primary && e.verified);
          const anyVerified = profile.emails.find((e) => e.verified);
          const selected = primaryVerified || anyVerified || profile.emails[0];
          if (selected?.value) {
            email = selected.value.toLowerCase().trim();
          }
        }

        // 2. Check profile._json.email
        if (!email && profile._json?.email) {
          email = profile._json.email.toLowerCase().trim();
        }

        // 3. If email wasn't included directly, attempt to fetch from GitHub user emails API
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

        // 4. Fallback: Users with private emails on GitHub receive an official GitHub noreply email address
        if (!email) {
          const username = profile.username || profile._json?.login || 'user';
          email = `${githubId}+${username}@users.noreply.github.com`.toLowerCase().trim();
          console.log(`[OAUTH] Using GitHub noreply email fallback for ${username}: ${email}`);
        }

        const name = profile.displayName || profile.username || profile._json?.name || profile._json?.login || 'GitHub User';
        const profilePicture = profile.photos?.[0]?.value || profile._json?.avatar_url || '';
        const githubUsername = profile.username || profile._json?.login || '';
        const githubLink = profile.profileUrl || (profile.username ? `https://github.com/${profile.username}` : (profile._json?.html_url || ''));

        // Encrypt the GitHub OAuth access token before saving
        const encryptedToken = accessToken ? encryptToken(accessToken) : '';

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

          const updateFields = {
            lastLogin: new Date(),
          };
          if (!user.githubId) updateFields.githubId = githubId;
          if (githubUsername) updateFields.githubUsername = githubUsername;
          if (encryptedToken) {
            updateFields.githubAccessTokenEncrypted = encryptedToken;
            updateFields.githubConnectedAt = new Date();
          }
          if (!user.githubLink && githubLink) updateFields.githubLink = githubLink;
          if (!user.socialLinks?.github && githubLink) {
            updateFields['socialLinks.github'] = githubLink;
          }
          if (!user.profilePicture && profilePicture) updateFields.profilePicture = profilePicture;
          if (!user.isVerified) updateFields.isVerified = true;

          user = await User.findByIdAndUpdate(user._id, { $set: updateFields }, { new: true });
        } else {
          // 3. Brand new user registration via GitHub
          user = await User.create({
            name,
            email,
            githubId,
            githubUsername,
            githubAccessTokenEncrypted: encryptedToken,
            githubConnectedAt: encryptedToken ? new Date() : undefined,
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

        console.log(`[OAUTH] GitHub login success for: ${user.email || email} (${user._id})`);
        return done(null, user);
      } catch (error) {
        console.error('[OAUTH] GitHub strategy error:', error.message);
        return done(error, null);
      }
    }
  );

  // Override userProfile to safely handle private emails without throwing InternalOAuthError
  githubStrategy.userProfile = function(accessToken, done) {
    const self = this;
    this._oauth2.get(this._userProfileURL, accessToken, (err, body) => {
      if (err) {
        return done(new Error('Failed to fetch user profile from GitHub: ' + (err.message || 'OAuth error')));
      }

      let json;
      try {
        json = JSON.parse(body);
      } catch (e) {
        return done(new Error('Failed to parse GitHub user profile response'));
      }

      const profile = {
        provider: 'github',
        id: String(json.id),
        username: json.login,
        displayName: json.name || json.login,
        profileUrl: json.html_url,
        photos: json.avatar_url ? [{ value: json.avatar_url }] : [],
        emails: [],
        _raw: body,
        _json: json,
      };

      if (json.email) {
        profile.emails.push({ value: json.email, primary: true, verified: true });
      }

      // Gracefully attempt to fetch private user emails without crashing on 403 or empty response
      self._oauth2.get(self._userEmailURL, accessToken, (emailErr, emailBody) => {
        if (!emailErr && emailBody) {
          try {
            const emailsJson = JSON.parse(emailBody);
            if (Array.isArray(emailsJson)) {
              const parsedEmails = emailsJson
                .filter(e => e && e.email)
                .map(e => ({
                  value: e.email,
                  primary: !!e.primary,
                  verified: !!e.verified,
                }));
              if (parsedEmails.length > 0) {
                profile.emails = parsedEmails;
              }
            }
          } catch (_) {
            // Ignore parse errors on emails
          }
        }
        return done(null, profile);
      });
    });
  };

  passport.use(githubStrategy);
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
