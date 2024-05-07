const fs = require("fs");
const { exec } = require("child_process");
const { TerraformGenerator, map } = require("terraform-generator");
const AWS = require('aws-sdk');
const { EC2Client, TerminateInstancesCommand } = require("@aws-sdk/client-ec2");
const { S3 } = require('aws-sdk/clients/s3');

// Configure AWS SDK
const ec2Client = new EC2Client({ region: "ca-central-1" }); 
AWS.config.update({ region: 'ca-central-1' }); 

// Generate Terraform Files
exports.generateTerraform = (req, res) => {
  console.log("Received request body:", req.body);

  const configs = req.body;

  // Initialize TerraformGenerator
  const tfg = new TerraformGenerator();

  // Generate the Terraform configuration for AWS
  tfg.provider("aws", {
    region: configs.region || "ca-central-1",
    profile: configs.profile || "default",
  });

  // Check if ec2Instance is true in the request body
  if (configs.ec2Instance) {
    // Generate the EC2 instance configuration
    const ec2Instance = tfg.resource("aws_instance", "my_ec2_instance", {
      ami: configs.ami || "ami-0c55b159cbfafe1f0",
      instance_type: configs.instance_type || "t2.micro",
      key_name: configs.keyName || "2024key",
      tags: map({
        Name: configs.name || "MyEC2Instance",
      }),
    });
  }

  // Generate S3 bucket configuration if generateS3Module is true
  if (configs.generateS3Module) {
    // Generate the S3 bucket configuration
    const s3BucketName = configs.s3BucketName || "example-bucket-name";
    const s3Bucket = tfg.resource("aws_s3_bucket", "my_s3_bucket", {
      bucket: s3BucketName,
    });

    // Generate S3 bucket policy if generateS3Module is true
    if (configs.generateS3Module) {
      // Generate the S3 bucket policy
      const s3BucketPolicy = tfg.resource("aws_s3_bucket_policy", "private_policy", {
        bucket: s3BucketName, 
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "PrivateContent",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:GetObject",
              Resource: `arn:aws:s3:::${s3BucketName}/*`
            }
          ]
        })
      });
    }
  }

  const result = tfg.generate();
  const terraformConfig = result.tf;

  console.log("Generated Terraform configuration:", terraformConfig);
  // Write the Terraform configuration to a file
  fs.writeFileSync("main.tf", terraformConfig);

  // Execute Terraform commands
  console.log("Executing terraform init");
  exec("terraform init", (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running terraform init: ${error}`);
      return;
    }
    console.log(`Output from terraform init: ${stdout}`);

    console.log("Executing terraform plan -out=tfplan");
    exec("terraform plan -out=tfplan", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running terraform plan: ${error}`);
        return;
      }
      console.log(`Output from terraform plan: ${stdout}`);

      console.log("Executing terraform apply -input=false tfplan");
      exec("terraform apply -input=false tfplan", (error, stdout, stderr) => {
        if (error) {
          console.error(`Error running terraform apply: ${error}`);
          return;
        }
        console.log(`Output from terraform apply: ${stdout}`);

        // Respond with the output of the Terraform apply command
        res.json({
          terraformOutput: stdout,
        });
      });
    });
  });
};

// Destroy EC2 instance
exports.destroyInstance = async (req, res) => {
  const instanceId = req.body.instanceId; // Expecting the instance ID in the request body

  if (!instanceId) {
    return res.status(400).send("Instance ID is required");
  }

  const params = {
    InstanceIds: [instanceId],
  };

  try {
    const data = await ec2Client.send(new TerminateInstancesCommand(params));
    console.log(data); // Log the data from AWS SDK
    res.send("Instance terminated successfully");
  } catch (err) {
    console.log(err, err.stack); // Log the error if there is one
    res.status(500).send("Failed to terminate instance");
  }
};
