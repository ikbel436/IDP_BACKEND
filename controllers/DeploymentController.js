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
  const getStartDate = (timeframe) => {
    const now = new Date();
    console.log('Current date and time:', now);
    switch (timeframe) {
        case 'daily':
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            console.log('Start of the day:', startOfDay);
            return startOfDay;
        case 'weekly':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Start of the current week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0); // Reset time to start of the day
            console.log('Start of the week:', startOfWeek);
            return startOfWeek;
        case 'monthly':
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Start of the current month
            console.log('Start of the month:', startOfMonth);
            return startOfMonth;
        default:
            const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            console.log('Default date:', defaultDate);
            return defaultDate;
    }
};

const deploymentStat = async (req, res) => {
    try {
        const { timeframe } = req.query; // 'daily', 'weekly', 'monthly'
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

            // Count failed deployments
            if (deployment.status === 'failed') {
                failedDeployments++;
            }
        });

        // Here you can implement any custom logic based on the `Deployment` model
        // For example, summarizing based on the `bundle` attribute
        const bundleSummary = deployments.reduce((summary, deployment) => {
            deployment.bundle.forEach(bundleId => {
                if (!summary[bundleId]) {
                    summary[bundleId] = 0;
                }
                summary[bundleId]++;
            });
            return summary;
        }, {});

        // Calculating additional stats dynamically
        const fixedDeployments = deployments.filter(d => d.status === 'passed').length;
        const wontFixDeployments = Math.floor(totalDeployments * 0.05); // Placeholder logic
        const reOpenedDeployments = Math.floor(totalDeployments * 0.2); // Placeholder logic
        const needsTriageDeployments = Math.floor(totalDeployments * 0.15); // Placeholder logic

        const overview = {
            new: totalDeployments,
            closed: failedDeployments, // Updated to show failed deployments
            fixed: fixedDeployments,
            wontFix: wontFixDeployments,
            reOpened: reOpenedDeployments,
            needsTriage: needsTriageDeployments,
            bundleSummary // Add your custom logic output here
        };

        res.status(200).json({ totalDeployments, deployments: deploymentCounts, labels, overview });
    } catch (error) {
        console.error('Error fetching deployment statistics:', error);
        res.status(500).json({ error: 'Failed to fetch deployment statistics' });
    }
};
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

// const deploymentFrequency = async (req, res) => {
//   try {
//     const { timeframe } = req.query; // 'daily', 'weekly', 'monthly'
//     const startDate = getStartDate(timeframe);

//     // Find users and their deployment counts within the timeframe
//     const users = await User.find().populate({
//       path: 'myDeployments',
//       match: { createdAt: { $gte: startDate } },
//       select: 'createdAt'
//     });

//     const totalUsers = users.length;
//     const totalDeployments = users.reduce((acc, user) => acc + user.myDeployments.length, 0);
//     const avgDeploymentsPerUser = totalUsers ? (totalDeployments / totalUsers).toFixed(2) : 0;

//     res.status(200).json({ totalUsers, totalDeployments, avgDeploymentsPerUser });
//   } catch (error) {
//     console.error('Error fetching deployment frequency statistics:', error);
//     res.status(500).json({ error: 'Failed to fetch deployment frequency statistics' });
//   }
// };
const deploymentFrequency = async (req, res) => {
  try {
    const { timeframe } = req.query; // 'daily', 'weekly', 'monthly'
    const startDate = getStartDate(timeframe);

    // Aggregation pipeline to get the deployment frequency and details
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
  retreive ,
  allDeployments,
  getDeployments,
  deploymentStat,
  deploymentSuccessRate,
  deploymentFrequency
};
