const express = require('express');
const router = express.Router();
const { isAuth, checkRole } = require('../middlewares/passport-setup.js');
const CloudServiceController = require('../controllers/CloudServiceController');

router.post('/add', isAuth(), checkRole(['admin']), CloudServiceController.addCloudService);
router.get('/list', isAuth(), CloudServiceController.getCloudServices);
router.patch('/update-availability', isAuth(), checkRole(['admin']), CloudServiceController.updateServiceAvailability);

module.exports = router;
