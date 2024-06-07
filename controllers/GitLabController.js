const axios = require("axios");

exports.GetGitLabRepos = async (req, res) => {
  if (!req.body.token ||!req.body.username) {
    return res.status(400).json({ message: "Token and Username are required" });
  }

  const { token, username } = req.body;

  try {
    const apiUrl = `https://gitlab.com/api/v4/users/${encodeURIComponent(username)}/projects`;
    const config = {
      headers: {
        "PRIVATE-TOKEN": token,
        Accept: "application/json",
      },
    };

    const response = await axios.get(apiUrl, config);
    res.json(response.data);
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.error('Hostname not found');
      res.status(503).json({ message: "Service temporarily unavailable" });
    } else {
      console.error(error.response? error.response.data : error.message);
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
};
