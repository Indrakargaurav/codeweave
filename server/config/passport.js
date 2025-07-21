const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // Update googleId if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

// Serialize & Deserialize for session (optional now, but required if using sessions)
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

const GitHubStrategy = require('passport-github2').Strategy;
const fetch = require('node-fetch'); // Add this import if not present

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let email = profile.emails?.[0]?.value;
        if (!email) {
          // Fetch emails from GitHub API
          const response = await fetch('https://api.github.com/user/emails', {
            headers: {
              Authorization: `token ${accessToken}`,
              'User-Agent': 'CodeWeave',
              Accept: 'application/vnd.github.v3+json',
            },
          });
          const emails = await response.json();
          // Find the primary, verified email
          const primaryEmail = Array.isArray(emails) && emails.find(e => e.primary && e.verified);
          email = primaryEmail?.email;
        }
        if (!email) {
          return done(new Error('GitHub email not available'), null);
        }
        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          // Update githubId if not set
          if (!user.githubId) {
            user.githubId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          githubId: profile.id,
          name: profile.displayName || profile.username,
          email: email,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
      callbackURL: '/auth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('LinkedIn email not available'), null);
        }

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
          // Update linkedinId if not set
          if (!user.linkedinId) {
            user.linkedinId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          linkedinId: profile.id,
          name: profile.displayName,
          email: email,
        });

        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);
