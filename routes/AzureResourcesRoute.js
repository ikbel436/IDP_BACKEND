const express = require('express');
const router = express.Router();
const azureResourcesController = require('../controllers/AzureResourcesController');
//const azureResourcesMiddleware = require('../middlewares/AzureResourcesMiddleware');
const axios = require('axios');

router.get('/resources', azureResourcesController.getResources);

module.exports = router;
