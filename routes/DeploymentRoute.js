const express = require('express');
const router = express.Router();
const { allDeployments, verifyToken ,retreive,getDeployments} = require('../controllers/DeploymentController');

router.get('/deployments', retreive);
router.get('/alldeployments',allDeployments);
router.get('/deploymentsUser', verifyToken, getDeployments);
module.exports = router;
