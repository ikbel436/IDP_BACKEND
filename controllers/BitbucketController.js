const axios = require("axios");

// Function to get the repository URL from Bitbucket
async function connect_bitbucket(req, res) {
  const accessToken = req.body.accessToken;
  const workspace = req.body.workspace;

  if (!accessToken || !workspace) {
    return res
      .status(400)
      .send({ error: "Access token and workspace are required." });
  }

  try {
    const repositories = await fetchRepositoriesFromBitbucket(
      accessToken,
      workspace
    );
    res.cookie("repositories", JSON.stringify(repositories), {
      maxAge: 86400000,
      httpOnly: true,
    });
    res.send(repositories);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch repositories." });
  }
}

async function fetchRepositoriesFromBitbucket(accessToken, workspace) {
  try {
    const response = await axios.get(
      `https://api.bitbucket.org/2.0/repositories/${workspace}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const enhancedRepositories = response.data.values.map((repo) => ({
      name: repo.name,
      description: repo.description || repo.summary,
      createdAt: repo.created_on,
      lastUpdated: repo.updated_on,
      cloneUrl: repo.links.clone[0].href,
      language: repo.language,
    }));
    return enhancedRepositories;
  } catch (error) {
    throw new Error("Failed to fetch repositories from Bitbucket.");
  }
}

module.exports = connect_bitbucket;
