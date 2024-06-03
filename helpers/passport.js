const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://aromatica.athul.cloud/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
   
        return done(null, profile);
   
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser(async (id, done) => {
        done(null, id);
   
});

module.exports = passport;

// http://aromatica.athul.cloud/auth/google/callback