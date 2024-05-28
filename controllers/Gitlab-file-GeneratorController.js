const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const axios = require("axios");

let globalTerraformConfig = "";

exports.generateGitlabCI = async (req, res) => {
  try {
    const { name, visibility } = req.body;
    if (!name || !visibility) {
      return res.status(400).send("Name and visibility are required");
    }

    const tools = req.body.tools;
    const terraformScript = generateTerraformScript(tools);
    const token = req.headers["token"];

    const tempDir = path.join(__dirname, "temp");
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "main.tf"), globalTerraformConfig);
    fs.writeFileSync(path.join(tempDir, ".gitlab-ci.yml"), terraformScript);
    const lockFilePath = path.join(__dirname, ".terraform.lock.hcl");
    const destLockFilePath = path.join(tempDir, ".terraform.lock.hcl");

    if (fs.existsSync(lockFilePath)) {
      fs.copyFileSync(lockFilePath, destLockFilePath);
    } else {
    }

    const git = simpleGit(tempDir);
    await git.init();
    const repoUrl = await createGitLabRepo(token, name, visibility);
    const remotes = await git.getRemotes();
    if (!remotes.some((remote) => remote.name === "origin")) {
      await git.addRemote("origin", repoUrl);
    } else {
      await git.removeRemote("origin");
      await git.addRemote("origin", repoUrl);
    }

    await git.add("./*");

    await git.commit("Initial commit");

    await git.push("origin", "master");

    fs.rmSync(tempDir, { recursive: true });

    res.send("Files pushed to GitLab successfully");
  } catch (error) {
    res.status(500).send("Failed to push files to GitLab");
  }
};

//Create the gitlab repository
async function createGitLabRepo(token, name, visibility) {
  try {
    const response = await axios.post(
      "https://gitlab.com/api/v4/projects",
      {
        name: name,
        visibility: visibility,
      },
      {
        headers: {
          "Private-Token": token,
        },
      }
    );
    return response.data.http_url_to_repo;
  } catch (error) {
    throw error;
  }
}

//Gitlab-CI.yaml File generator
function generateTerraformScript(tools) {
  if (!Array.isArray(tools)) {
    return "";
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

  tools.forEach((tool) => {
    if (tool === "nginx") {
      script += `sudo amazon-linux-extras install -y nginx1.12\n`;
      script += `sudo systemctl start nginx\n`;
      script += `sudo systemctl enable nginx\n`;
    } else if (tool === "apache") {
      script += `sudo yum install -y httpd\n`;
      script += `sudo systemctl start httpd\n`;
      script += `sudo systemctl enable httpd\n`;
    }
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
