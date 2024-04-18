const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const axios = require("axios");

let globalTerraformConfig = '';


exports.generateGitlabCI = async (req, res) => {
  try {
    // Extract the name and visibility from the request body
    const { name, visibility } = req.body;
    if (!name || !visibility) {
      return res.status(400).send("Name and visibility are required");
    }

    const tools = req.body.tools;
    const terraformScript = generateTerraformScript(tools);
    const token = req.headers["token"]; // Extract the token from the request headers

    // Create a temporary folder
    const tempDir = path.join(__dirname, "temp");
    fs.mkdirSync(tempDir, { recursive: true });

    // Write the generated files to the temporary folder
    fs.writeFileSync(path.join(tempDir, "main.tf"), globalTerraformConfig);
    fs.writeFileSync(path.join(tempDir, ".gitlab-ci.yml"), terraformScript);
    const lockFilePath = path.join(__dirname, ".terraform.lock.hcl");
    // Define the destination path for the lock file in the temporary folder
    const destLockFilePath = path.join(tempDir, ".terraform.lock.hcl");

    // Check if the terraform.lock.hcl file exists and copy it to the temporary folder
    if (fs.existsSync(lockFilePath)) {
      fs.copyFileSync(lockFilePath, destLockFilePath);
    } else {
      console.log(".terraform.lock.hcl file not found. Skipping...");
    }

    // Initialize a git repository in the temporary folder
    const git = simpleGit(tempDir);
    await git.init();

    // Create a new GitLab project with the provided name and visibility
    const repoUrl = await createGitLabRepo(token, name, visibility);

    // Check if the remote 'origin' already exists
    const remotes = await git.getRemotes();
    if (!remotes.some((remote) => remote.name === "origin")) {
      // Add the GitLab repository as a remote if 'origin' does not exist
      await git.addRemote("origin", repoUrl);
    } else {
      // If 'origin' exists, update its URL to the new HTTPS URL
      await git.removeRemote("origin");
      await git.addRemote("origin", repoUrl);
    }

    // Add all files to the staging area
    await git.add("./*");

    // Commit the changes
    await git.commit("Initial commit");

    // Push the changes to the GitLab repository
    await git.push("origin", "master");

    // Cleanup: remove the temporary directory
    fs.rmSync(tempDir, { recursive: true });

    // Send a single response after all operations are completed
    res.send("Files pushed to GitLab successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Failed to push files to GitLab");
  }
};

//Create the gitlab repository
async function createGitLabRepo(token, name, visibility) {
    try {
         const response = await axios.post('https://gitlab.com/api/v4/projects', {
           name: name, 
           visibility: visibility, 
         }, {
           headers: {
             'Private-Token': token 
           }
         });
         return response.data.http_url_to_repo;
    } catch (error) {
         console.error('Error creating GitLab repo:', error.response.data);
         console.log("Object data: %o", error.response.data);
    
         throw error; 
    }
   }


//Gitlab-CI.yaml File generator
   function generateTerraformScript(tools) {
    // Ensure tools is always an array
    if (!Array.isArray(tools)) {
         console.error('Invalid or missing tools array');
         return ''; // Return an empty string or handle the error appropriately
    }
   
    let script = `
    include:
   - template: Terraform/Base.gitlab-ci.yml 
   
   stages:
   - prepare
   - validate
   - plan
   - apply
   
   variables:
   AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY
   AWS_DEFAULT_REGION: "ca-central-1"
   
   prepare:
   stage: prepare
   script:
    - |
       cat > user_data.tf <<EOF
       variable "user_data" {
         default = <<-EOF
         #!/bin/bash
         sudo yum update -y
         sudo yum install -y httpd
         sudo systemctl start httpd
         sudo systemctl enable httpd
         `;
   
    // Add installation commands for each tool
    tools.forEach(tool => {
         if (tool === 'nginx') {
             script += `sudo amazon-linux-extras install -y nginx1.12\n`;
             script += `sudo systemctl start nginx\n`;
             script += `sudo systemctl enable nginx\n`;
         } else if (tool === 'apache') {
             script += `sudo yum install -y httpd\n`;
             script += `sudo systemctl start httpd\n`;
             script += `sudo systemctl enable httpd\n`;
         }
         // Add more tools as needed
    });
   
    script += `EOF
       }
       EOF
   artifacts:
    paths:
       - user_data.tf
   
   validate:
   stage: validate
   script:
    - terraform init
    - terraform validate
   dependencies:
    - prepare
   
   plan:
   stage: plan
   script:
    - terraform plan -out=tfplan
   artifacts:
    paths:
       - tfplan
   dependencies:
    - prepare
   
   apply:
   stage: apply
   script:
    - terraform apply -auto-approve tfplan
   dependencies:
    - plan
   `;
   
    return script;
   }
   
