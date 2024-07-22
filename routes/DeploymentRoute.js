const express = require('express');
const router = express.Router();
const { allDeployments, verifyToken ,retreive,getDeployments,deploymentStat,deploymentSuccessRate,deploymentFrequency} = require('../controllers/DeploymentController');

router.get('/deployments', retreive);
router.get('/alldeployments',allDeployments);
router.get('/deploymentsUser', verifyToken, getDeployments);
router.get('/deployment-stats',deploymentStat);
router.get('/stat-namespace',deploymentSuccessRate);
router.get('/stat-avg-user',deploymentFrequency);
module.exports = router;
