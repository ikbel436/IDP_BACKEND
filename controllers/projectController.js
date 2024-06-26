const Project = require("../models/Project.js");
const config = require("config");
const { concat } = require("lodash");
const path = require("path");
const fs = require("fs");
const secretOrKey = config.get("secretOrKey");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const archiver = require("archiver");
const AWS = require("aws-sdk");
const { exec } = require('child_process');
const Deployment = require('../models/Deployment.js');

// create project and assign it to a user
exports.createProject = async (req, res) => {
  const {
    name,
  description,
  createdAt,
  lastUpdated,
  cloneUrl,
  language,
  DBType,
  DockerImage , 
  Status ,
  SonarQube 
  } = req.body;
  var crypto = require("crypto");
  var reference = crypto.randomBytes(30).toString("hex");

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    // Decode the JWT token to get the user ID
    const decoded = jwt.verify(token, secretOrKey);
    const userId = decoded.id;

    const newProject = new Project({
      name,
      description,
      createdAt,
      lastUpdated,
      cloneUrl,
      language,
      DBType,
      DockerImage , 
      Status ,
      SonarQube 
    });

    await newProject.save();

    // Assign the project to the user
    const searchedUser = await User.findOne({ _id: userId });
    if (!searchedUser) {
      return res.status(404).json({ errors: "User not found" });
    }
    searchedUser.myProject.push(newProject._id);
    const user = await User.findByIdAndUpdate(userId, searchedUser, {
      strictPopulate: false,
      new: true,
      useFindAndModify: false,
    }).populate({ path: "myProject", model: Project });

    return res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ errors: error });
  }
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  jwt.verify(token, secretOrKey, (err, decoded) => {
    if (err) {
      return res.status(401).json({ msg: "Token is not valid" });
    }
    req.user = decoded;
    next();
  });
};

// Update a project
exports.updateProject = [
  verifyToken,
  async (req, res) => {
    const projectId = req.params.id;
    const projectData = req.body;
    try {
      const updatedProject = await Project.findByIdAndUpdate(
        projectId,
        projectData,
        { new: true }
      );
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(200).json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

exports.retreive = [
  verifyToken,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).populate("myProject");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const projects = user.myProject;

      res.status(200).json({ projects });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Delete a project
exports.deleteProject = [
  verifyToken,
  async (req, res) => {
    const projectId = req.params.id;

    try {
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const user = await User.findOne({ myProject: projectId });
      if (user) {
        user.myProject.pull(projectId);
        await user.save();
      }

      await Project.findByIdAndDelete(projectId);
      res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

//Get User with id
exports.retreivebyId = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.status(200).json(project);
  } catch (err) {
    return res.status(500).json({ msg: err.message });
  }
};

// Function to generate a directory for Kubernetes files
const generateK8sDir = () => {
  const dir = path.join(__dirname, 'k8s');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return dir;
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
      if (stderr && !stderr.includes('AlreadyExists')) {
        return reject(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

const applyK8sFilesInSequence = async (filePaths, namespace) => {
  for (const filePath of filePaths) {
    if (filePath) {
      await applyK8sFileWithKubectl(filePath, namespace);
    }
  }
};


const applyK8sFileWithKubectl = (filePath, namespace) => {
  return new Promise((resolve, reject) => {
    exec(`kubectl apply -f ${filePath} -n ${namespace}`, (error, stdout, stderr) => {
      if (error) {
        return reject(`error: ${error.message}`);
      }
      if (stderr) {
        return reject(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};
exports.applyGeneratedK8sFiles = async (req, res) => {
  const { files, name, description, bundles, namespace } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, config.get("secretOrKey"));
    const userId = decoded.id;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ msg: "Invalid input. 'files' should be an array of file paths." });
    }

    const sanitizedNamespace = namespace
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      await createNamespace(sanitizedNamespace);
      await applyK8sFilesInSequence(files, sanitizedNamespace);
      
      // Save the deployment information with status 'passed'
      const deployment = new Deployment({
        name,
        description,
        bundle: bundles,
        user: userId,
        status: 'passed',
        namespace: sanitizedNamespace
      });
      await deployment.save();

      // Update the user document to include this deployment
      await User.findByIdAndUpdate(userId, { $push: { myDeployments: deployment._id } });

      return res.status(200).json({ msg: "Kubernetes files applied successfully." });
    } catch (error) {
      // Save the deployment information with status 'failed'
      const deployment = new Deployment({
        name,
        description,
        bundle: bundles,
        user: userId,
        status: 'failed',
        namespace: sanitizedNamespace
      });
      await deployment.save();

      // Update the user document to include this deployment
      await User.findByIdAndUpdate(userId, { $push: { myDeployments: deployment._id } });
console.log(error)
      return res.status(500).json({ errors: error.message });
    }
  } catch (error) {
    res.status(500).json({ errors: error.message });
  }
};

// Function to generate ConfigMap with user-provided key-value pairs
const generateConfigMap = (data) => {
  let dataYaml = '';
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      dataYaml += `  ${key}: "${data[key]}"\n`;
    }
  }

  return `
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: achat-depl
data:
${dataYaml}`;
};

// Express.js route handler to generate the ConfigMap file
exports.generateConfigMapFile = async (req, res) => {
  const { data } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.get('secretOrKey'));
    const userId = decoded.id;

    const configMapYaml = generateConfigMap(data); 

    const k8sDir = generateK8sDir();
    const configMapFilePath = path.join(k8sDir, `backend-config.yaml`);
    fs.writeFileSync(configMapFilePath, configMapYaml);

    await applyK8sFileWithKubectl(configMapFilePath);

    return res.status(201).json({ msg: 'ConfigMap file generated and applied', configMapFilePath });
  } catch (error) {
    res.status(500).json({ errors: error.message });
  }
};
const generateDatabaseDeployment = (dbType, serviceName, dbName, port, envVariables,namespace) => {
  const sanitizedNamespace = namespace
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');
 
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
        image: ${dbType === 'mysql' ? 'mysql:5.7' : 'mongo:latest'}
        env:
${envVariables.map(envVar => `
        - name: ${envVar.name}
          ${envVar.valueFrom ? `
          valueFrom:
            configMapKeyRef:
              name: ${envVar.valueFrom.configMapName}
              key: ${envVar.valueFrom.key}
          ` : `
          value: "${envVar.value}"
          `}
`).join('')}
        ports:
        - containerPort: ${port}
`;

  return serviceYaml + deploymentYaml;
};
exports.generateDataBaseFile = async (req, res) =>{
  const { dbType, serviceName, dbName, port, envVariables,namespace } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.get('secretOrKey'));
    const userId = decoded.id;

    const deploymentYaml = generateDatabaseDeployment(dbType, serviceName, dbName, port, envVariables,namespace);
    const k8sDir = generateK8sDir();
    const deploymentFilePath = path.join(k8sDir, `${serviceName}-deployment.yaml`);
    fs.writeFileSync(deploymentFilePath, deploymentYaml);

    // Apply the generated deployment file using kubectl
   // await applyK8sFileWithKubectl(deploymentFilePath);

    res.status(201).json({ msg: 'Database deployment file generated and applied', deploymentFilePath });
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.log(error);
  }
};
const generateSpringBootDeployment = (serviceName, port, image, envVariables,namespace) => {
  const sanitizedNamespace = namespace
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/^-+|-+$/g, '');
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
        env:
${envVariables.map(envVar => `
        - name: ${envVar.name}
          ${envVar.valueFrom ? `
          valueFrom:
            configMapKeyRef:
              name: ${envVar.valueFrom.configMapName}
              key: ${envVar.valueFrom.key}
          ` : `
          value: "${envVar.value}"
          `}
`).join('')}
`;

  return serviceYaml + deploymentYaml;
};
exports.generateDeploymentFile = async (req, res) => {
  const { serviceName, port, image, envVariables, expose, host, namespace } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const sanitizedNamespace = namespace
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/^-+|-+$/g, '');
  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.get('secretOrKey'));
    const userId = decoded.id;

    const deploymentYaml = generateSpringBootDeployment(serviceName, port, image, envVariables, sanitizedNamespace);
    const k8sDir = generateK8sDir();
    const deploymentFilePath = path.join(k8sDir, `${serviceName}-deployment.yaml`);
    fs.writeFileSync(deploymentFilePath, deploymentYaml);

    if (expose) {
      const ingressFilePath = path.join(k8sDir, `${serviceName}-ingress.yaml`);
      let ingressYaml = '';

      if (fs.existsSync(ingressFilePath)) {
        const existingIngress = fs.readFileSync(ingressFilePath, 'utf8');
        ingressYaml = addRuleToExistingIngress(existingIngress, serviceName, host, port, sanitizedNamespace);
      } else {
        const rules = [{ host: `${host}.idp.insparkconnect.com`, serviceName, port, sanitizedNamespace }];
        ingressYaml = generateIngress(rules);
      }

      fs.writeFileSync(ingressFilePath, ingressYaml);
    }

    res.status(201).json({ msg: 'Deployment file generated and applied', deploymentFilePath });
  } catch (error) {
    res.status(500).json({ errors: error.message });
  }
};
const generateIngress = (rules) => {
 
  const rulesYaml = rules.map(rule => `
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
  `).join('');

  return `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: idp-poc-staging-ingress
  namespace: ${rules[0].sanitizedNamespace} 
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
const addRuleToExistingIngress = (existingIngress, serviceName, host, port, namespace) => {
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

  const ingressWithNamespace = existingIngress.replace(
    /namespace: .+/,
    `namespace: ${namespace}`
  );

  const splitIngress = ingressWithNamespace.split('rules:');
  return `${splitIngress[0]}rules:${splitIngress[1]}${newRule}`;
};