const axios = require('axios');

// Function to get the repository URL from Bitbucket
async function connect_bitbucket(req, res) {
    const accessToken = req.body.accessToken;
    const workspace = req.body.workspace;

    if (!accessToken || !workspace) {
        return res.status(400).send({ error: 'Access token and workspace are required.' });
    }

    try {
        const repositories = await fetchRepositoriesFromBitbucket(accessToken, workspace);
        // Optionally, store the repositories in a cookie or session here
        res.cookie('repositories', JSON.stringify(repositories), { maxAge: 86400000, httpOnly: true });
        res.send({ repositories });
        console.log(JSON.stringify(repositories));
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

        const enhancedRepositories = response.data.values.map(repo => ({
            name: repo.name,
            description: repo.description || repo.summary,
            createdAt: repo.created_on,
            lastUpdated: repo.updated_on,
            cloneUrl: repo.links.clone[0].href,
            language: repo.language,
            //slug: repo.slug,

        }));
        return { enhancedRepositories };


    } catch (error) {
        throw new Error('Failed to fetch repositories from Bitbucket.');
    }
}

module.exports = connect_bitbucket;
