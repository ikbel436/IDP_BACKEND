const express = require('express');
const router = express.Router();
const { getWorkflowRunStatus } = require('../controllers/actionsController');

router.post('/run-status', getWorkflowRunStatus);

module.exports = router;
