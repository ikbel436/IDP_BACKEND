// BitbucketRoute.js
const express = require('express');
const router = express.Router();
const connect_bitbucket = require('../controllers/BitbucketController')
const { isAuth, checkRole } = require('../middlewares/passport-setup.js');

router.post('/connect_bitbucket', isAuth(), checkRole(['User']), connect_bitbucket);
module.exports = router;
