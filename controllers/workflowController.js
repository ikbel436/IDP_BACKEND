const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const filePaths = {
    dockerhub: path.join(__dirname, '../CI-Pipelines/github-template.yml'),
    github: path.join(__dirname, '../CI-Pipelines/docker-publish.yml')
};

exports.readYaml = async ({ platform }) => {
    const filePathTemplate = filePaths[platform];

    if (!filePathTemplate) {
        throw new Error('Invalid platform specified');
    }

    try {
        const fileContents = await fs.readFile(filePathTemplate, 'utf8');
        const data = yaml.load(fileContents);
        return data;
    } catch (e) {
        throw new Error(`Error reading YAML file: ${e.message}`);
    }
};

exports.updateYaml = async ({ owner, token, repo, platform, yamlData }) => {
    const file = filePaths[platform];

    if (!file) {
        throw new Error('Invalid platform specified');
    }

    try {
        const yamlContent = yaml.dump(yamlData);
        await fs.writeFile(file, yamlContent, 'utf8');

        // await pushWorkflowToFile({ owner, token, repo, platform });

        return true;
    } catch (e) {
        throw new Error(`Error updating YAML file: ${e.message}`);
    }
};

async function pushWorkflowToFile(body) {
    const { owner, token, repo, platform } = body;
    const filePath = '.github/workflows/docker-publish.yml';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
    const fileContent = await fs.readFile('./CI-Pipelines/docker-publish.yml', 'utf8');

    const sha = await getLatestSha(owner, repo, filePath, token);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: 'Update nodejs workflow',
            content: Buffer.from(fileContent).toString('base64'),
            sha
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create workflow file: ${await response.text()}`);
    }
}

async function getLatestSha(owner, repo, filePath, token) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?path=${encodeURIComponent(filePath)}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch latest commit SHA: ${await response.text()}`);
    }
    return response.json().then(data => data[0].sha);
}
module.exports = { pushWorkflowToFile };