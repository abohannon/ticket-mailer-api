import passport from 'passport';
import LocalStrategy from 'passport-local';
import User from '../models/user';

const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');


// //////* LOCAL STRATEGY *///////

// Create local strategy
const localOptions = { usernameField: 'email' };

const localLogin = new LocalStrategy(localOptions, (email, password, done) => {
  // Verify this username and password, call done with the user
  // if correct, otherwise call done with false
  User.findOne({ email }, (err, user) => {
    if (err) return done(err);

    // user not found
    if (!user) {
      return done(null, false, { message: 'Incorrect login.' });
    }

    // compare passwords
    user.comparePassword(password, (passwordErr, isMatch) => {
      if (passwordErr) return done(passwordErr);

      // password doesn't macth
      if (!isMatch) return done(null, false, { message: 'Incorrect login.' });

      // password matches, return user.
      return done(null, user);
    });
  });
});

// //////* JWT STRATEGY *///////

// Setup options for JWT strategy
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader('authorization'),
  secretOrKey: process.env.JWT_SECRET,
};

// Create JWT strategy
const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  // See if the user ID in the payload exists in our DB
  // If it does, call 'done' with that user
  // otherwise, call done without a user object

  User.findById(payload.sub, (err, user) => {
    if (err) return done(err, false); // error when looking for user

    if (user) {
      done(null, user);
    } else {
      done(null, false); // user not found
    }
  });
});

// Tell passport to use this strategy
passport.use(jwtLogin);
passport.use(localLogin);
