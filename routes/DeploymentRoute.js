const express = require('express');
const router = express.Router();
const {  verifyToken ,getDeployments,deploymentStat,deploymentSuccessRate,deploymentFrequency,deleteDeployment} = require('../controllers/DeploymentController');


router.get('/deploymentsUser', verifyToken, getDeployments);
router.get('/deployment-stats',deploymentStat);
router.get('/stat-namespace',deploymentSuccessRate);
router.get('/stat-avg-user',deploymentFrequency);
router.delete("/delete-depl/:id",deleteDeployment);
module.exports = router;
