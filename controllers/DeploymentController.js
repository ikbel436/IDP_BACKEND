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

  
// Retrieve all deployments for admin
const getAllDeploymentsForAdmin = async (req, res) => {
    try {
      const users = await User.find().populate({
        path: 'myDeployments',
        populate: {
          path: 'bundle',
          select: 'name description',
          populate: {
            path: 'Projects',
            select: 'name description'
          }
        }
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
        populate: {
          path: 'bundle',
          select: 'name description',
          populate: {
            path: 'Projects',
            select: 'name description'
          }
        }
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
  

  // Function to delete a deployment
  const deleteDeployment = [
    verifyToken,
    async (req, res) => {
      const deploymentId = req.params.id;
  
      try {
        const user = await User.findById(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
  
        if (user.Role !== 'admin') {
          return res.status(403).json({ message: "Access denied. Admins only." });
        }
  
        const deployment = await Deployment.findById(deploymentId);
        if (!deployment) {
          return res.status(404).json({ message: "Deployment not found" });
        }
  
        await Deployment.findByIdAndDelete(deploymentId);
        res.status(200).json({ message: "Deployment deleted successfully" });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  ];
  // Function to get the start date based on the timeframe
  const getStartDate = (timeframe) => {
    const now = new Date();

    switch (timeframe) {
        case 'daily':
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       
            return startOfDay;
        case 'weekly':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); 
            startOfWeek.setHours(0, 0, 0, 0); 
          
            return startOfWeek;
        case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); 
         
            return startOfMonth;
        default:
            const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
            return defaultDate;
    }
};
// Function to retrieve deployment statistics
const deploymentStat = async (req, res) => {
    try {
        const { timeframe } = req.query; 
        const startDate = getStartDate(timeframe);

        const deployments = await Deployment.find({
            createdAt: { $gte: startDate }
        }).sort({ createdAt: 1 });

        const totalDeployments = deployments.length;

        const labels = [];
        const deploymentCounts = [];
        let failedDeployments = 0;

        deployments.forEach(deployment => {
            const date = deployment.createdAt.toISOString().split('T')[0];
            if (!labels.includes(date)) {
                labels.push(date);
                deploymentCounts.push(1);
            } else {
                const index = labels.indexOf(date);
                deploymentCounts[index]++;
            }
            if (deployment.status === 'failed') {
                failedDeployments++;
            }
        });

        const bundleSummary = deployments.reduce((summary, deployment) => {
            deployment.bundle.forEach(bundleId => {
                if (!summary[bundleId]) {
                    summary[bundleId] = 0;
                }
                summary[bundleId]++;
            });
            return summary;
        }, {});
        const overview = {
            new: totalDeployments,
            closed: failedDeployments, 
            bundleSummary 
        };

        res.status(200).json({ totalDeployments, deployments: deploymentCounts, labels, overview });
    } catch (error) {
        console.error('Error fetching deployment statistics:', error);
        res.status(500).json({ error: 'Failed to fetch deployment statistics' });
    }
};
// Function to retrieve deployment success rate
const deploymentSuccessRate = async (req, res) => {
  try {
      const { timeframe } = req.query;
      const startDate = getStartDate(timeframe);

      const deployments = await Deployment.find({
          createdAt: { $gte: startDate }
      }).sort({ createdAt: 1 });

      const namespaces = {};

      deployments.forEach(deployment => {
          if (!namespaces[deployment.namespace]) {
              namespaces[deployment.namespace] = { total: 0, passed: 0, failed: 0 };
          }
          namespaces[deployment.namespace].total++;
          if (deployment.status === 'passed') {
              namespaces[deployment.namespace].passed++;
          } else if (deployment.status === 'failed') {
              namespaces[deployment.namespace].failed++;
          }
      });

      const namespaceStats = Object.keys(namespaces).map(namespace => {
          const total = namespaces[namespace].total;
          const passed = namespaces[namespace].passed;
          const successRate = (passed / total) * 100;
          return {
              namespace,
              totalDeployments: total,
              successRate: successRate.toFixed(2), // keeping two decimal points
              failedDeployments: namespaces[namespace].failed
          };
      });

      res.status(200).json({ namespaceStats });
  } catch (error) {
      console.error('Error fetching deployment statistics:', error);
      res.status(500).json({ error: 'Failed to fetch deployment statistics' });
  }
};

// Function to retrieve deployment frequency
const deploymentFrequency = async (req, res) => {
  try {
    const { timeframe } = req.query; 
    const startDate = getStartDate(timeframe);
    const userDeploymentDetails = await User.aggregate([
      {
        $lookup: {
          from: 'deployments',
          localField: 'myDeployments',
          foreignField: '_id',
          as: 'deployments'
        }
      },
      {
        $match: {
          'deployments.createdAt': { $gte: startDate }
        }
      },
      {
        $project: {
          name: 1,
          totalDeployments: { $size: '$deployments' },
          totalBundles: {
            $size: {
              $reduce: {
                input: '$deployments.bundle',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this'] }
              }
            }
          },
          totalProjects: {
            $size: {
              $reduce: {
                input: '$deployments.bundle',
                initialValue: [],
                in: { $concatArrays: ['$$value', '$$this.Projects'] }
              }
            }
          }
        }
      }
    ]);

    const totalUsers = userDeploymentDetails.length;
    const totalDeployments = userDeploymentDetails.reduce((acc, user) => acc + user.totalDeployments, 0);
    const avgDeploymentsPerUser = totalUsers ? (totalDeployments / totalUsers).toFixed(2) : 0;

    res.status(200).json({ totalUsers, totalDeployments, avgDeploymentsPerUser, userDeploymentDetails });
  } catch (error) {
    console.error('Error fetching deployment frequency statistics:', error);
    res.status(500).json({ error: 'Failed to fetch deployment frequency statistics' });
  }
};

module.exports = {
  verifyToken,
  getDeployments,
  deploymentStat,
  deploymentSuccessRate,
  deploymentFrequency,
  deleteDeployment
};
