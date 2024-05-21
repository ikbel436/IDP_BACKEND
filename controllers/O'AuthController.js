const crypto=require('crypto');
const axios=require('axios');
// const CLIENT_ID = config.get("CLIENT_ID");
// const CLIENT_SECRET = config.get("CLIENT_SECRET");
// const REDIRECT_URI = config.get("REDIRECT_URI");
const config = require('../config/default.json');

exports.Authpage = (req, res) => {
    // let CLIENT_ID="Ov23lifvqMbu9H4NqCxd"
    // let CLIENT_SECRET="f7c5d30e4a53137023d59311eef69a785f9d3189"
    // let REDIRECT_URI="http://localhost:4200/sign-in?redirectURL=%2Fprofile"
  let state = crypto.randomBytes(16).toString("hex");
  res.cookie("XSRF-TOKEN", state);
  res.send({
    authUrl:
      "https://github.com/login/oauth/authorize?client_id=" +
      config.CLIENT_ID+
      "&redirect_uri=" +
      encodeURIComponent(config.REDIRECT_URI) + // Make sure to encode the URI
      "&scope=read:user&allow_signup=" +
      true +
      "&state=" +
      state,
});

};

exports.getAcessToken = (req, res) => {
    let state = req.query.state; // Assuming state is passed as a query parameter
    // let CLIENT_ID="Ov23lifvqMbu9H4NqCxd"
    // let CLIENT_SECRET="f7c5d30e4a53137023d59311eef69a785f9d3189"
    // let REDIRECT_URI="http://localhost:4200/sign-in?redirectURL=%2Fprofile"
    
     axios({
        url:
          "https://github.com/login/oauth/access_token?client_id=" +
          config.CLIENT_ID +
          "&client_secret=" +
          config.CLIENT_SECRET +
          "&code=" +
          req.body.code +
          "&redirect_uri=" +
          config.REDIRECT_URI +
          "&state=" +
          state,
          
        method: "POST",
        headers: { Accept: "application/json" },
        
      })
     .then(function (resp) {
        console.log("this is the code",config.REDIRECT_URI)
        if (resp.data.access_token) {
          // Directly send the access token in the response
          res.json({ GitToken: resp.data.access_token });
        } else {
          res.status(400).json({ error: "Access token not found" });
        }
      })
     .catch(function (err) {
        res.status(500).json({ error: err.message });
      });
  };
  
  exports.getGithubUserDetails = (req, res) => {
    if (req.query.GitToken) { // Assuming GitToken is passed as a query parameter
      console.log("this is the code",req.query.GitToken)
       axios({
          url: "https://api.github.com/user",
          method: "GET",
          headers: { Authorization: "token " + req.query.GitToken },
        })
       .then(function (resp) {
          res.json(resp.data); // Directly send the user details
        })
       .catch(function (err) {
          res.status(500).json({ error: err.message });
        });
    } else {
      res.status(401).json({ error: "No access token provided" });
    }
  };
