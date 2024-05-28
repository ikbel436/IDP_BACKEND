const express = require('express');
const router = express.Router();
const azureResourcesController = require('../controllers/AzureResourcesController');
//const azureResourcesMiddleware = require('../middlewares/AzureResourcesMiddleware');

//router.use(azureResourcesMiddleware.logRequest);

router.get('/resources', azureResourcesController.getResources);

module.exports = router;
