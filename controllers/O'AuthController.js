const crypto = require("crypto");
const axios = require("axios");

exports.GetRepos = async (req, res) => {
  const { token } = req.body;
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error(error.response.data); 
    res.status(401).json({ message: "Invalid or missing token" });
}

};
