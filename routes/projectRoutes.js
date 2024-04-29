const express = require("express");

const { registerRules, validator } = require("../middlewares/validator.js");
const isAuth = require("../middlewares/passport-setup.js");

const router = express.Router();

const {
  createProject,
updateProject,
deleteProject
} = require("../controllers/projectController.js");

router.post("/project", createProject);
router.put('/project/:id', updateProject);
router.delete('/project/:id', deleteProject);

module.exports = router;
