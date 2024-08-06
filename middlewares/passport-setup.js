const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const passport = require("passport");
const config = require("config");
const secretOrKey = config.get("secretOrKey");

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
    if (!roles.includes(req.user.Role)) {
      return res.status(403).send("Access Forbidden: You don't have enough privileges");
    }
    next();
  };
};

const checkDeviceId = (req, res, next) => {
  const token = req.cookies['jwt'] || (req.headers.authorization && req.headers.authorization.split(" ")[1]);

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, secretOrKey);
    const { deviceId } = decoded;

    if (req.body.deviceId !== deviceId) {
      res.clearCookie('jwt'); // Clear cookie if device ID doesn't match
      return res.status(401).json({ msg: 'Invalid device ID, please re-authenticate' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('jwt'); // Clear cookie if token verification fails
    return res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = {
  isAuth,
  checkRole,
  checkDeviceId
};