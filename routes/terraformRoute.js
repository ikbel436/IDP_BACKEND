
const express = require('express');
const router = express.Router();
const terraformController = require('../controllers/terraformController');

router.post('/generate-terraform', terraformController.generateTerraform);
router.post('/destroy-instance', terraformController.destroyInstance);

module.exports = router;
