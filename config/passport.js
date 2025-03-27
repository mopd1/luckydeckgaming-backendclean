const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const crypto = require('crypto');  // Add this line

// Move everything into an initialization function
function initializePassport(User) {
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

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({
                where: { google_id: profile.id }
            });
            if (!user) {
                user = await User.create({
                    google_id: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName,
                    password_hash: crypto.randomBytes(16).toString('hex') // random password for Google users
                });
            }
            return done(null, user);
        } catch (error) {
            return done(error, null);
        }
    }));

    return passport;
}

module.exports = initializePassport;
