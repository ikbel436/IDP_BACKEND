const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const passport = require("passport");
const config = require("config");
const secretOrKey = config.get("secretOrKey");


// Define the extractJwtFromCookie function before using it
const extractJwtFromCookie = (req) => {
 if (req && req.cookies) {
    return req.cookies['jwt'];
 }
 return null;
};


const opts = {
 jwtFromRequest: extractJwtFromCookie, // Use the custom extraction function
 secretOrKey,
};

passport.initialize();

passport.use(
 new JwtStrategy(opts, async (jwt_payload, done) => {
    const { id } = jwt_payload;
    try {
      const user = await User.findById(id).select("-password");
      user ? done(null, user) : done(null, false);
    } catch (error) {
      console.log(error);
    }
 })
);

module.exports = isAuth = () =>
 passport.authenticate("jwt", { session: false });
