const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Deployment = mongoose.model('Deployment');
const User = mongoose.model('user');
const config = require('config');
const secretOrKey = config.get('secretOrKey');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  jwt.verify(token, secretOrKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ msg: 'Token is not valid' });
    }
    req.user = decoded;
    next();
  });
};

// Get all users
const allDeployments = async (req, res) => {
    try {
      const deployment = await Deployment.find();
      res.status(200).json({
        deployment,
      });
    } catch (err) {
      return res.status(500).json({ msg: err.message });
    }
  };

const retreive = [
    verifyToken,
    async (req, res) => {
      try {
        const user = await User.findById(req.user.id).populate("myDeployments");
  
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
  
        const deployment = user.myDeployments;
  
        res.status(200).json({ deployment });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  ];
  
module.exports = {
  verifyToken,
  retreive ,
  allDeployments
};
