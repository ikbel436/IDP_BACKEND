
const express = require('express');
const  {GenerateScript, generatePod, generateReplicatSet}  = require('../controllers/Kubernetes-file-GeneratorController');
const router = express.Router();


router.post('/generate-pod', generatePod);
router.post('/generate-replicaset', generateReplicatSet);



module.exports = router;
