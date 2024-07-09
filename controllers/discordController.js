const express = require('express');
const axios = require('axios');


const CLIENT_ID = '1260197694186590241';
const CLIENT_SECRET = 'xZki7kdq5vQYuOgadafnwL3Wkplvmqmn';
const REDIRECT_URI = 'http://localhost:8000/auth/discord';
exports.redirectToDiscord = (req, res) => {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds' // Adjust scopes as per your needs
    });
    res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  };
  
  exports.handleDiscordCallback = async (req, res) => {
    const code = req.query.code;
  
    try {
      // Exchange code for access token
      const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        scope: 'identify guilds' // Must match the scopes from the initial request
      }));
  
      const accessToken = tokenResponse.data.access_token;
  
      // Use access token to fetch user information
      const userResponse = await axios.get('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
  
      const user = userResponse.data;
  
      // Respond with user data in JSON format
      res.json(user);
    } catch (error) {
      console.error('Error fetching user data from Discord:', error.message);
      res.status(500).json({ error: 'Failed to fetch user data from Discord' });
    }
  };