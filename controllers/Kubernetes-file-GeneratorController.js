const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { execSync } = require("child_process");
const config = require("config");
const { exec } = require("child_process");
const Deployment = require("../models/Deployment");
const User = require("../models/User");
const util = require("util");
const execAsync = util.promisify(exec);
require("dotenv").config();
const Bundle = require("../models/Bundle");
const DatabaseConfig = require("../models/Database");
const ProjectDeploymentConfig = require("../models/ProjectDeployment");
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');
const { S3Client, CreateBucketCommand, PutObjectCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { fromIni } = require("@aws-sdk/credential-provider-ini");
const TerraformGenerator = require("terraform-generator").default;
const AWS = require("aws-sdk");
// AWS S3 configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const generateArgoCDProject = (namespace) => {
  return `
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: test-${namespace}-project
  namespace: argocd
spec:
  sourceRepos:
    - 'https://bitbucket.org/insparkconnect/idp-infra/src/main/'
  destinations:
    - namespace: ${namespace}
      server: 'https://kubernetes.default.svc'
  description: Project for ${namespace}'s test application
  `;
};
const generateArgoCDApplication = (namespace, fileName) => {
  return `
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${namespace}-test-app
  namespace: argocd
spec:
  project: test-${namespace}-project
  source:
    repoURL: 'https://bitbucket.org/insparkconnect/idp-infra/src/main/'
    path: applications/${namespace}
    targetRevision: HEAD
    directory:
      recurse: true
      jsonnet: {}
  destination:
    server: 'https://kubernetes.default.svc'
    namespace: ${namespace}
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
    automated:
      prune: true
      selfHeal: true
  `;
};


// Helper function to list files from S3
async function listFilesInS3(bucketName) {
  const params = {
    Bucket: bucketName,
  };
  const data = await s3.listObjectsV2(params).promise();
  return data.Contents.map(item => item.Key);
}

// Helper function to get file from S3
async function getFileFromS3(bucketName, key) {
  const params = { Bucket: bucketName, Key: key };
  const data = await s3.getObject(params).promise();
  return data.Body.toString('utf-8');
}

// Function to upload file to Bitbucket
async function uploadFileToBitbucket(filePath, fileContent, commitMessage) {
  const bitbucketUsername = process.env.BITBUCKET_USERNAME;
  const bitbucketAppPassword = process.env.BITBUCKET_APP_PASSWORD;
  const repoSlug = 'idp-infra';
  const repoOwner = 'insparkconnect';

  const url = `https://api.bitbucket.org/2.0/repositories/${repoOwner}/${repoSlug}/src`;

  const data = new FormData();
  data.append('message', commitMessage);
  data.append('branch', 'main');
  data.append(filePath, fileContent);

  const response = await axios.post(url, data, {
    auth: {
      username: bitbucketUsername,
      password: bitbucketAppPassword
    },
    headers: data.getHeaders()
  });

  return response.data;
}

const pushToBitbucketFromS3 = async (namespace) => {
  const sanitizedNamespace = sanitizeBucketName(namespace);
  const folderName = `${sanitizedNamespace}`.slice(0, 63);

  const fileNames = await listFilesInS3('insparki-dp');

  for (const fileName of fileNames) {
    const fileContent = await getFileFromS3('insparki-dp', fileName);
    const filePath = `applications/${fileName}`;
    await uploadFileToBitbucket(filePath, fileContent, `Add ${fileName} for ${namespace}`);
  }

  const argoCDProjectYaml = generateArgoCDProject(namespace);
  const argoCDApplicationYaml = generateArgoCDApplication(namespace, `${fileNames[0]}`);

  await uploadFileToBitbucket(`argo-apps/${sanitizedNamespace}/${namespace}-project.yaml`, argoCDProjectYaml, `Add ArgoCD project for ${namespace}`);
  await uploadFileToBitbucket(`argo-apps/${sanitizedNamespace}/${namespace}-application.yaml`, argoCDApplicationYaml, `Add ArgoCD application for ${namespace}`);
};


// Function to generate a directory for Kubernetes files
exports.testPush = async (req, res) => {
  const { name, description, bundles, namespace } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  if (!namespace) {
    return res.status(400).send({ error: "Namespace is required" });
  }

  const sanitizedNamespace = namespace.toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  try {
    const decoded = jwt.verify(token, config.get("secretOrKey"));
    const userId = decoded.id;

    try {
      await pushToBitbucketFromS3(sanitizedNamespace);

      // Save the deployment information with status 'passed'
      const deployment = new Deployment({
        name,
        description,
        bundle: bundles,
        user: userId,
        status: "passed",
        namespace: sanitizedNamespace,
      });
      await deployment.save();

      // Update the user document to include this deployment
      await User.findByIdAndUpdate(userId, {
        $push: { myDeployments: deployment._id },
      });

      res.status(200).json({ message: "Files pushed to Bitbucket successfully." });
    } catch (error) {
      // Save the deployment information with status 'failed'
      const deployment = new Deployment({
        name,
        description,
        bundle: bundles,
        user: userId,
        status: "failed",
        namespace: sanitizedNamespace,
      });
      await deployment.save();

      // Update the user document to include this deployment
      await User.findByIdAndUpdate(userId, {
        $push: { myDeployments: deployment._id },
      });

      console.error(error);
      res.status(500).json({
        message: `An error occurred during git push: ${error.message}`,
      });
    }
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.error(error);
  }
};
const namespaceExists = (namespace) => {
  return new Promise((resolve, reject) => {
    exec(`kubectl get namespace ${namespace}`, (error, stdout, stderr) => {
      if (error) {
        // If the namespace does not exist, kubectl will return an error
        return resolve(false);
      }
      resolve(true);
    });
  });
};

const createNamespace = (namespace) => {
  return new Promise(async (resolve, reject) => {
    const exists = await namespaceExists(namespace);
    if (exists) {
      return resolve(`Namespace ${namespace} already exists`);
    }

    exec(`kubectl create namespace ${namespace}`, (error, stdout, stderr) => {
      if (error) {
        return reject(`error: ${error.message}`);
      }
      if (stderr && !stderr.includes("AlreadyExists")) {
        return reject(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

const generateDatabaseDeployment = (
  dbType,
  serviceName,
  dbName,
  port,
  envVariables,
  namespace
) => {
  const sanitizedNamespace = namespace
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  const serviceYaml = `
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}-service
  namespace: ${sanitizedNamespace}
spec:
  ports:
  - port: ${port}
    targetPort: ${port}
  selector:
    app: ${serviceName}
---
`;

  const envSection = envVariables && envVariables.length > 0
    ? `env:
${envVariables
  .map(
    (envVar) => `
          - name: ${envVar.name}
            ${
              envVar.valueFrom
                ? `
            valueFrom:
              configMapKeyRef:
                name: ${envVar.valueFrom.configMapName}
                key: ${envVar.valueFrom.key}
            `
                : `
            value: "${envVar.value}"
            `
            }
`
  )
  .join("")}`
    : '';

  const deploymentYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}
  namespace: ${sanitizedNamespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      containers:
      - name: ${serviceName}
        image: ${dbType === "mysql" ? "mysql:5.7" : "mongo:latest"}
        ${envSection}
        ports:
        - containerPort: ${port}
`;

  return serviceYaml + deploymentYaml;
};
AWS.config.update({ 
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();
function sanitizeBucketName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '') // Remove invalid characters
    .replace(/^-+|-+$/g, '') // Remove leading and trailing hyphens
    .replace(/\.+/g, '.'); // Remove consecutive dots
}

// Function to add a database configuration to a bundle
async function addDatabaseConfigToBundle(bundleId, databaseConfigId) {
  try {
    const bundle = await Bundle.findById(bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Assuming databaseConfigId is the ObjectId of the DatabaseConfig instance
    bundle.myDBconfig.push(databaseConfigId);
    await bundle.save();

    return bundle;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
exports.generateDataBaseFile = async (req, res) => {
  const { dbType, serviceName, dbName, port, envVariables, namespace, bundleId } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.get("secretOrKey"));
    const userId = decoded.id;

    const deploymentYaml = generateDatabaseDeployment(
      dbType,
      serviceName,
      dbName,
      port,
      envVariables,
      namespace
    );

    // Sanitize namespace to create a valid bucket name
    const sanitizedNamespace = sanitizeBucketName(namespace);
    let folderName = `${sanitizedNamespace}`.slice(0, 63);

    // Ensure bucket name starts and ends with a letter or number
    folderName = folderName.replace(/^-/, 'a').replace(/-$/, 'z');


    // Upload the content directly to S3
    const uploadParams = {
      Bucket: 'insparki-dp',
      Key: `${folderName}/${serviceName}-deployment.yaml`,
      Body: deploymentYaml,
    };

    console.log('Uploading file to S3:', uploadParams);
    const uploadResult = await s3.upload(uploadParams).promise();
    console.log('File uploaded to S3:', uploadResult);

    const existingBundle = await Bundle.findById(bundleId).populate('myDBconfig');

    if (!existingBundle) {
      return res.status(404).json({ msg: "Bundle not found" });
    }

    let dbConfig;
    if (existingBundle.myDBconfig) {
      // Update existing database configuration
      dbConfig = await DatabaseConfig.findById(existingBundle.myDBconfig._id);
      dbConfig.type = dbType;
      dbConfig.port = port;
      dbConfig.envVariables = envVariables.map((variable) => ({
        key: variable.name,
        value: variable.value,
      }));
      await dbConfig.save();
    } else {
      // Create new database configuration
      dbConfig = new DatabaseConfig({
        type: dbType,
        serviceName: serviceName,
        port: port,
        envVariables: envVariables.map((variable) => ({
          key: variable.name,
          value: variable.value,
        })),
      });
      await dbConfig.save();
      existingBundle.myDBconfig = dbConfig._id;
      await existingBundle.save();
    }

    res.status(200).json({
      msg: "Database deployment file generated and uploaded to S3, and database configuration updated.",
      s3Bucket: 'insparki-dp',
      s3FilePath: uploadResult.Location,
      bundleId: existingBundle._id,
    });
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.error(error);
  }
};

const generateSpringBootDeployment = (
  serviceName,
  port,
  image,
  envVariables,
  namespace,
  imagePullSecretName
) => {
  const sanitizedNamespace = namespace
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  const serviceYaml = `
apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}-service
  namespace: ${sanitizedNamespace}
spec:
  type: NodePort
  selector:
    app: ${serviceName}
  ports:
  - port: ${port}
    targetPort: ${port}
---
`;

  const envSection =
    envVariables && envVariables.length > 0
      ? `
        env:
${envVariables
  .map(
    (envVar) => `
          - name: ${envVar.name}
            ${
              envVar.valueFrom
                ? `
            valueFrom:
              configMapKeyRef:
                name: ${envVar.valueFrom.configMapName}
                key: ${envVar.valueFrom.key}
            `
                : `
            value: "${envVar.value}"
            `
            }
`
  )
  .join("")}
      `
      : "";

  const imagePullSecretsSection = imagePullSecretName
    ? `
      imagePullSecrets:
      - name: ${imagePullSecretName}
  `
    : "";

  const deploymentYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}
  namespace: ${sanitizedNamespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      containers:
      - name: ${serviceName}
        image: ${image}
        ports:
        - containerPort: ${port}
        ${imagePullSecretsSection}
        ${envSection}
`;

  return serviceYaml + deploymentYaml;
};

const createDockerRegistrySecret = async (
  secretName,
  dockerUsername,
  dockerPassword,
  dockerEmail,
  namespace
) => {
  const sanitizedNamespace = namespace
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "");

  await createNamespace(sanitizedNamespace);

  const command = `kubectl create secret docker-registry ${secretName} --docker-username=${dockerUsername} --docker-password=${dockerPassword} --docker-email=${dockerEmail} --namespace=${sanitizedNamespace}`;
  execSync(command);
};

exports.generateDeploymentFile = async (req, res) => {
  const {
    serviceName,
    port,
    image,
    dockerTag,
    registryType,
    privacy,
    envVariables,
    expose,
    host,
    namespace,
    dockerUsername,
    dockerPassword,
    dockerEmail,
    imagePullSecretName,
    bundleId,
    projectId
  } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.get("secretOrKey"));
    const userId = decoded.id;

    if (
      imagePullSecretName &&
      dockerUsername &&
      dockerPassword &&
      dockerEmail
    ) {
      createDockerRegistrySecret(
        imagePullSecretName,
        dockerUsername,
        dockerPassword,
        dockerEmail,
        namespace
      );
    }
    const fullImage = `${image}:${dockerTag}`;
    const deploymentYaml = generateSpringBootDeployment(
      serviceName,
      port,
      fullImage,
      envVariables,
      namespace,
      imagePullSecretName
    );

    let ingressYaml = "";

    // Sanitize namespace to create a valid bucket name
    const sanitizedNamespace = sanitizeBucketName(namespace);
    let folderName = `${sanitizedNamespace}`.slice(0, 63);

    // Ensure bucket name starts and ends with a letter or number
    folderName = folderName.replace(/^-/, 'a').replace(/-$/, 'z');

    // Upload the deployment YAML content to S3
    const deploymentUploadParams = {
      Bucket: 'insparki-dp',
      Key: `${folderName}/${serviceName}-deployment.yaml`,
      Body: deploymentYaml,
    };
    console.log("upppp",deploymentUploadParams)
    const deploymentUploadResult = await s3.upload(deploymentUploadParams).promise();

    let ingressUploadResult = null;
    const ingressKey = `${folderName}/ingress.yaml`;
    if (expose) {
      if (await checkFileExistsInS3('insparki-dp', ingressKey)) {
        const existingIngress = await getFileFromS3('insparki-dp', ingressKey);
        ingressYaml = addRuleToExistingIngress(
          existingIngress,
          serviceName,
          host,
          port,
          namespace
        );
      } else {
        const rules = [
          {
            host: `${host}.idp.insparkconnect.com`,
            serviceName,
            port,
            namespace,
          },
        ];
        ingressYaml = generateIngress(rules);
      }

      // Upload the ingress YAML content to S3
      const ingressUploadParams = {
        Bucket: 'insparki-dp',
        Key: ingressKey,
        Body: ingressYaml,
      };
      ingressUploadResult = await s3.upload(ingressUploadParams).promise();

      console.log('Uploading ingress to S3:', ingressUploadParams);
    }

    const existingProject = await Project.findById(projectId).populate('myprojectDepl');
    if (!existingProject) {
      return res.status(404).json({ msg: "Project not found" });
    }

    let projectDeploymentData;
    if (existingProject.myprojectDepl && existingProject.myprojectDepl.length > 0) {
      // Update the existing deployment
      const deploymentId = existingProject.myprojectDepl[0]._id;
      projectDeploymentData = await ProjectDeploymentConfig.findByIdAndUpdate(
        deploymentId,
        {
          serviceName,
          port,
          image: fullImage,
          registryType,
          privacy,
          envVariables: envVariables.map((variable) => ({
            key: variable.name,
            value: variable.value,
          })),
          expose,
          host,
          namespace,
        },
        { new: true }
      );
    } else {
      // Create new deployment
      projectDeploymentData = new ProjectDeploymentConfig({
        serviceName,
        port,
        image: fullImage,
        registryType,
        privacy,
        envVariables: envVariables.map((variable) => ({
          key: variable.name,
          value: variable.value,
        })),
        expose,
        host,
        namespace,
      });
      await projectDeploymentData.save();

      existingProject.myprojectDepl.push(projectDeploymentData._id);
      await existingProject.save();
    }

    res.status(201).json({
      msg: existingProject.myprojectDepl.length > 0 ? "Deployment files updated and applied" : "Deployment files generated and applied",
      s3FilePath: [
        deploymentUploadResult.Location,
        ingressUploadResult ? ingressUploadResult.Location : null
      ].filter(Boolean),
      projectId: existingProject._id,
      bundleId,
    });
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.log(error);
  }
};

// Helper function to check if file exists in S3
async function checkFileExistsInS3(bucketName, key) {
  try {
    await s3.headObject({ Bucket: bucketName, Key: key }).promise();
    return true;
  } catch (err) {
    if (err.code === 'NotFound') {
      return false;
    }
    throw err;
  }
}

// Helper function to get file from S3
async function getFileFromS3(bucketName, key) {
  const params = { Bucket: bucketName, Key: key };
  const data = await s3.getObject(params).promise();
  return data.Body.toString('utf-8');
}

const generateIngress = (rules) => {
  const rulesYaml = rules
    .map(
      (rule) => `
    - host: ${rule.host}
      http:
        paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: ${rule.serviceName}-service
              port:
                number: ${rule.port}
  `
    )
    .join("");

  return `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: idp-poc-staging-ingress
  namespace: ${rules[0].namespace} 
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/group.name: idp-poc-cluster-alb-ingress-group
  labels:
    app: idp-staging-apps
spec:
  ingressClassName: alb
  rules: 
${rulesYaml}
`;
};

const addRuleToExistingIngress = (
  existingIngress,
  serviceName,
  host,
  port,
  namespace
) => {
  const newRule = `
    - host: ${host}.idp.insparkconnect.com
      http:
        paths:
        - path: /
          pathType: Prefix
          backend:
            service:
              name: ${serviceName}-service
              port:
                number: ${port}
  `;

  // Ensure the existing ingress has the correct namespace
  const ingressWithNamespace = existingIngress.replace(
    /namespace: .+/,
    `namespace: ${namespace}`
  );

  // Check if the service already exists in the ingress rules
  const ruleRegex = new RegExp(`- host: [\\w.-]+\\s+http:\\s+paths:\\s+- path: /\\s+pathType: Prefix\\s+backend:\\s+service:\\s+name: ${serviceName}-service\\s+port:\\s+number: \\d+`, 'g');
  const match = ruleRegex.exec(ingressWithNamespace);

  if (match) {
    // If the service exists, replace the existing rule with the new rule
    const updatedIngress = ingressWithNamespace.replace(match[0], newRule.trim());
    return updatedIngress;
  } else {
    // If the service does not exist, add the new rule
    const splitIngress = ingressWithNamespace.split("rules:");
    if (splitIngress.length > 1) {
      return `${splitIngress[0]}rules:${splitIngress[1]}\n${newRule}`;
    } else {
      return `${ingressWithNamespace.trim()}\nrules:\n${newRule}`;
    }
  }
};