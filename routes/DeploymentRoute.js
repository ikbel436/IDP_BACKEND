const express = require('express');
const router = express.Router();
const { allDeployments, verifyToken ,retreive} = require('../controllers/DeploymentController');

router.get('/deployments', retreive);
router.get('/alldeployments',allDeployments);
module.exports = router;
