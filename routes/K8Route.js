
const express = require('express');
const  {GenerateScript, generatePod}  = require('../controllers/Kubernetes-file-GeneratorController');
const router = express.Router();


router.post('/generate-pod', generatePod);



module.exports = router;
