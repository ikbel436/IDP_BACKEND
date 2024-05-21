// BitbucketRoute.js
const express = require('express');
const router = express.Router();
const connect_bitbucket = require('../controllers/BitbucketController')

router.post('/connect_bitbucket', connect_bitbucket);
module.exports = router;
