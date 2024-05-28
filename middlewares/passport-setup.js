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

const isAuth = () => passport.authenticate("jwt", { session: false });
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey,
};

passport.use(
  new JwtStrategy(opts, async (jwt_payload, done) => {
    const { id } = jwt_payload;
    try {
      const user = await User.findById(id).select("-password");
      user ? done(null, user) : done(null, false);
    } catch (error) {
      console.log(error);
      done(error, false);
    }
  })
);
passport.initialize();



const checkRole = (roles) => {
  return (req, res, next) => {
    console.log("User Role from Token: ", req.user.Role);
    if (!roles.includes(req.user.Role)) {
      return res.status(403).send("Access Forbidden: You don't have enough privileges");
    }
    next();
  };
};

module.exports = {
  isAuth,
  checkRole,
};


