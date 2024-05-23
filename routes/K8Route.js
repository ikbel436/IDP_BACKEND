
const express = require('express');
const  {GenerateScript, generatePod, generateReplicatSet, generateDeployment}  = require('../controllers/Kubernetes-file-GeneratorController');
const router = express.Router();


router.post('/generate-pod', generatePod);
router.post('/generate-replicaset', generateReplicatSet);
router.post('/generate-deployment',generateDeployment);



module.exports = router;
