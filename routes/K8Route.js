const express = require("express");
const {
  generatePod,
  generateReplicatSet,
  generateDeployment,
  generateConfigMapFile,
  generateDataBaseFile,
  generateDeploymentFile,
  applyGeneratedK8sFiles,
  testPush,
} = require("../controllers/Kubernetes-file-GeneratorController");
const router = express.Router();

// router.post('/generate-pod', generatePod);
// router.post('/generate-replicaset', generateReplicatSet);
// router.post('/generate-deployment',generateDeployment);
// router.post('/generate-configmap', generateConfigMapFile);
router.post("/generate-database-deployment", generateDataBaseFile);
router.post("/generate-deployment", generateDeploymentFile);
router.post("/apply-generated-k8s-files", applyGeneratedK8sFiles);
router.post('/testPush', testPush);
module.exports = router;
