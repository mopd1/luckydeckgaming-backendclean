const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User } = require('../models');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
      // Check if user exists
      let user = await User.findOne({
        where: {
          google_id: profile.id
        }
      });

      if (!user) {
        // Check if user exists with same email
        user = await User.findOne({
          where: {
            email: profile.emails[0].value
          }
        });

        if (user) {
          // Link Google account to existing user
          user.google_id = profile.id;
          user.auth_provider = 'google';
          await user.save();
        } else {
          // Create new user
          user = await User.create({
            username: `user_${profile.id.substr(0, 8)}`,
            email: profile.emails[0].value,
            google_id: profile.id,
            auth_provider: 'google',
            is_email_verified: true,
            profile_picture_url: profile.photos[0]?.value,
            chips: 10000, // Starting chips for new users
            gems: 0
          });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
