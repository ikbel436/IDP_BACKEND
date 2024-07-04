const axios = require('axios');

const getWorkflowRunStatus = async (req, res) => {
    const { owner, repo, token } = req.body;

    if (!owner || !repo || !token) {
        return res.status(400).json({ error: 'Owner, repo, and token are required' });
    }

    try {
        // Fetch workflow runs from GitHub API
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        // Assuming the latest workflow run is what you're interested in
        const latestRun = response.data.workflow_runs[0];

        const simplifiedResponse = {
            type: "GITHUB",
            org: owner,
            repo: repo,
            workflow: latestRun.name,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            run_number: latestRun.run_number,
            html_url: latestRun.html_url,
            created_at: latestRun.created_at,
            updated_at: latestRun.updated_at
        };

        res.status(200).json(simplifiedResponse);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getWorkflowRunStatus
};
