const express = require("express");

const { registerRules, validator } = require("../middlewares/validator.js");
const isAuth = require("../middlewares/passport-setup.js");

const router = express.Router();

const {
  createProject,
updateProject,
deleteProject,
retreive,
retreivebyId,generateConfigMapFile,generateDataBaseFile,generateDeploymentFile

} = require("../controllers/projectController.js");

router.post("/project", createProject);
router.put('/project/:id', updateProject);
router.delete('/projects/:id', deleteProject);
router.get("/get",retreive);
router.get("/get/:id",retreivebyId);
router.post('/generate-configmap', generateConfigMapFile);
router.post('/generate-database-deployment',generateDataBaseFile);
router.post('/generate-deployment',generateDeploymentFile);
module.exports = router;
