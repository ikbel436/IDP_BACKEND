const express = require('express');
const router = express.Router();
const { handleDiscordCallback,redirectToDiscord} = require('../controllers/discordController');

router.get('/auth/discord', redirectToDiscord);
router.get('/auth/discord/callback', handleDiscordCallback);
