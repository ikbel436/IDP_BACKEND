const express = require('express');
const router = express.Router();
const projectDeplController = require('../controllers/ProjectDeplController');

// Update project deployment configuration
router.put('/:id', projectDeplController.updateProjectDepl);

module.exports = router;
