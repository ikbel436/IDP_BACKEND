const axios = require('axios');

// Function to get the repository URL from Bitbucket
async function connect_bitbucket(req, res) {
    const accessToken = req.body.access_token;
    const workspace = req.body.workspace;

    if (!accessToken || !workspace) {
        return res.status(400).send({ error: 'Access token and workspace are required.' });
    }

    try {
        const repositories = await fetchRepositoriesFromBitbucket(accessToken, workspace);
        // Optionally, store the repositories in a cookie or session here
        res.send({ success: true, repositories });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to fetch repositories.' });
    }
}

// Moved outside of the connect_bitbucket function
async function fetchRepositoriesFromBitbucket(accessToken, workspace) {
    try {
        const response = await axios.get(`https://api.bitbucket.org/2.0/repositories/${workspace}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });
        // Map over the repositories array to include additional details
        const enhancedRepositories = response.data.values.map(repo => ({
            name: repo.name,
            description: repo.description || repo.summary,
            createdAt: repo.created_on,
            lastUpdated: repo.updated_on,
            cloneUrl: repo.links.clone[0].href,
            language: repo.language,
        }));

        return enhancedRepositories; // Corrected to return the repositories instead of sending them in the response
    } catch (error) {
        throw new Error('Failed to fetch repositories from Bitbucket.');
    }
}

module.exports = connect_bitbucket;
