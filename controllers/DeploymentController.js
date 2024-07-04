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
  
// Retrieve all deployments for admin
const getAllDeploymentsForAdmin = async (req, res) => {
    try {
      const users = await User.find().populate({
        path: 'myDeployments',
        populate: { path: 'bundle', select: 'name description' }
      });
  
      let deployments = [];
      users.forEach(user => {
        user.myDeployments.forEach(deployment => {
          deployments.push({
            ...deployment.toObject(),
            user: { name: user.name, email: user.email }
          });
        });
      });
  
      return res.status(200).json(deployments);
    } catch (error) {
      res.status(500).json({ errors: error.message });
    }
  };
  
  // Retrieve deployments for the logged-in user
  const getDeploymentsForUser = async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate({
        path: 'myDeployments',
        populate: { path: 'bundle', select: 'name description' }
      });
  
      if (!user) {
        return res.status(404).json({ msg: 'User not found' });
      }
  
      const deployments = user.myDeployments.map(deployment => ({
        ...deployment.toObject(),
        user: { name: user.name, email: user.email }
      }));
  
      return res.status(200).json(deployments);
    } catch (error) {
      res.status(500).json({ errors: error.message });
    }
  };
  
  // Main function to retrieve deployments based on user role
  const getDeployments = async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
  
      if (user.Role === 'admin') {
        return getAllDeploymentsForAdmin(req, res);
      } else {
        return getDeploymentsForUser(req, res);
      }
    } catch (error) {
      res.status(500).json({ errors: error.message });
    }
  };
  
module.exports = {
  verifyToken,
  retreive ,
  allDeployments,
  getDeployments
};
