
const express = require('express');
const router = express.Router();
const gitlabController = require('../controllers/Gitlab-file-GeneratorController');

router.post('/generate-gitlab-ci', gitlabController.generateGitlabCI);

module.exports = router;
