const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const filePaths = {
    dockerhub: path.join(__dirname, '../CI-Pipelines/docker-image.yml'),
    github: path.join(__dirname, '../CI-Pipelines/docker-publish.yml')
};

const readYaml = async ({ platform }) => {
    const filePathTemplate = filePaths[platform];

    if (!filePathTemplate) {
        throw new Error('Invalid platform specified');
    }

    try {
        const fileContents = await fs.readFile(filePathTemplate, 'utf8');
        const data = yaml.load(fileContents);
        //console.log("l contenu hneeee", fileContents)
        return fileContents;

    } catch (e) {
        throw new Error(`Error reading YAML file: ${e.message}`);
    }
};

const updateYaml = async ({ platform, yamlData }) => {
    const file = filePaths[platform];

    if (!file) {
        throw new Error('Invalid platform specified');
    }

    try {
        const yamlContent = yaml.dump(yamlData);
        await fs.writeFile(file, yamlContent, 'utf8');

        return true;
    } catch (e) {
        throw new Error(`Error updating YAML file: ${e.message}`);
    }
};

const updateYamlBranches = async ({ platform, branches }) => {
    const file = filePaths[platform];

    if (!file) {
        throw new Error('Invalid platform specified');
    }

    try {
        const fileContents = await fs.readFile(file, 'utf8');
        const yamlData = yaml.load(fileContents);
        console.log("your data here ", yamlData);
        if (yamlData.on) {
            if (yamlData.on.push) {
                yamlData.on.push.branches = branches.slice();  // Use slice to avoid reference
            } else {
                throw new Error('Invalid YAML structure: "push" section not found');
            }

            if (yamlData.on.pull_request) {
                yamlData.on.pull_request.branches = branches.slice();  // Use slice to avoid reference
            } else {
                throw new Error('Invalid YAML structure: "pull_request" section not found');
            }
        } else {
            throw new Error('Invalid YAML structure: "on" section not found');
        }

        // Write the updated YAML content back to the file
        const yamlContent = yaml.dump(yamlData, { noRefs: true });
        await fs.writeFile(file, yamlContent, 'utf8');

        return true;
    } catch (e) {
        throw new Error(`Error updating YAML file: ${e.message}`);
    }
};

async function pushWorkflowToFile(body) {
    const { owner, token, repo, platform } = body;
    const filePathTemplate = filePaths[platform];

    if (!filePathTemplate) {
        throw new Error('Invalid platform specified');
    }

    const filePath = platform === 'dockerhub' ? '.github/workflows/docker-image.yml' : '.github/workflows/docker-publish.yml';
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
    const fileContent = await fs.readFile(filePathTemplate, 'utf8');

    //const sha = await getLatestSha(owner, repo, filePath, token);
    let sha;
    try {
        sha = await getLatestSha(owner, repo, filePath, token);
    } catch (error) {
        if (error.message.includes('No commits found for the specified file path')) {
            sha = null; // File does not exist, so no SHA to update
        } else {
            throw error;
        }
    }

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: 'Update nodejs workflow',
            content: Buffer.from(fileContent).toString('base64'),
            sha: sha || undefined
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to create workflow file: ${await response.text()}`);
    }
}


async function getLatestSha(owner, repo, filePath, token) {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?path=${encodeURIComponent(filePath)}`;
    console.log(`Fetching latest SHA for URL: ${url}`); // Debugging line
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
    const data = await response.json();
    console.log(`SHA Data: ${JSON.stringify(data, null, 2)}`); // Debugging line
    if (!data || data.length === 0) {
        throw new Error('No commits found for the specified file path.');
    }
    return data[0].sha;
}

module.exports = { pushWorkflowToFile, readYaml, updateYaml, updateYamlBranches };
