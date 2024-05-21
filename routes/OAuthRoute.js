const express = require('express');
const { Authpage, getAcessToken, getGithubUserDetails } = require('../controllers/O\'AuthController');
const router = express.Router();

// Authpage route
router.get('/auth', Authpage );

// getAccessToken route
router.post('/access-token', getAcessToken);

// getGithubUserDetails route
router.get('/user-details',getGithubUserDetails );

module.exports = router;