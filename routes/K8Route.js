const express = require("express");
const {
  generateDataBaseFile,
  generateDeploymentFile,
  applyGeneratedK8sFiles,
  testPush,
} = require("../controllers/Kubernetes-file-GeneratorController");
const router = express.Router();

router.post("/generate-database-deployment", generateDataBaseFile);
router.post("/generate-deployment", generateDeploymentFile);
// router.post("/apply-generated-k8s-files", applyGeneratedK8sFiles);
router.post('/testPush', testPush);
module.exports = router;
