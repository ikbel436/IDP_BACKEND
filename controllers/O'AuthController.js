const crypto = require("crypto");
const axios = require("axios");

exports.GetRepos = async (req, res) => {
  const { token } = req.body; // Extract token from the request body
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid or missing token" });
  }
};
