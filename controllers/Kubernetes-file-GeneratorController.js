const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { execSync } = require("child_process");
const config = require("config");
const { exec } = require("child_process");
const Deployment = require("../models/Deployment");
const User = require("../models/User");
const util = require('util');
const execAsync = util.promisify(exec);
require('dotenv').config();

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
    automated:
      prune: true
      selfHeal: true
  `;
};
const pushToBitbucket = async (namespace, filePaths) => {
  const repoDir = `C:\\Users\\user\\Desktop\\kubernetes\\idp-infra`;
  const argoAppsDir = path.join(repoDir, 'argo-apps');
  const argoProjectsDir = path.join(repoDir, 'argo-project');
  const username = process.env.BITBUCKET_USERNAME;
  const appPassword = process.env.BITBUCKET_APP_PASSWORD;

  if (!username || !appPassword) {
    throw new Error('Bitbucket username or app password is not set in the environment variables');
  }

  try {
    // Configure git to use the credential helper
    await execAsync(`git config --global credential.helper store`);
    
    // Write credentials to .git-credentials file
    const gitCredentials = `https://${username}:${appPassword}@bitbucket.org\n`;
    fs.writeFileSync(path.join(process.env.HOME, '.git-credentials'), gitCredentials);

    process.chdir(repoDir);

    await execAsync(`git pull`); // Ensure we have the latest changes

    const namespaceDir = path.join(repoDir, 'applications', namespace);
    if (!fs.existsSync(namespaceDir)) {
      fs.mkdirSync(namespaceDir, { recursive: true });
    }

    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const destinationPath = path.join(namespaceDir, fileName);
      fs.copyFileSync(filePath, destinationPath);

      await execAsync(`git add ${destinationPath}`);
    }

    if (!fs.existsSync(argoAppsDir)) {
      fs.mkdirSync(argoAppsDir, { recursive: true });
    }

    const argoAppFilePath = path.join(argoAppsDir, `${namespace}-test-app.yaml`);
    const argoAppContent = generateArgoCDApplication(namespace, path.basename(filePaths[0]));
    fs.writeFileSync(argoAppFilePath, argoAppContent);

    await execAsync(`git add ${argoAppFilePath}`);

    if (!fs.existsSync(argoProjectsDir)) {
      fs.mkdirSync(argoProjectsDir, { recursive: true });
    }

    const argoProjectFilePath = path.join(argoProjectsDir, `test-${namespace}-project.yaml`);
    const argoProjectContent = generateArgoCDProject(namespace);
    fs.writeFileSync(argoProjectFilePath, argoProjectContent);

    await execAsync(`git add ${argoProjectFilePath}`);
    
    const commitMessage = `Apply files and ArgoCD Application and Project for namespace: ${namespace}`;
    await execAsync(`git commit -m "${commitMessage}"`);
    await execAsync('git push');
    await execAsync(`kubectl apply -f ${argoProjectFilePath}`);
    process.chdir('..');
   
  } catch (error) {
    process.chdir('..');
    throw new Error(`An error occurred during git push: ${error.message}`);
  }
};
exports.testPush = async (req, res) => {
  const { filePaths, name, description, bundles,namespace } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  if (!filePaths || !namespace) {
    return res.status(400).send('filePaths and namespace are required');
  }

  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return res.status(400).send('filePaths should be a non-empty array');
  }
  const sanitizedNamespace = namespace
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, "-")
  .replace(/^-+|-+$/g, "");
  await createNamespace(sanitizedNamespace);
  try {
    const decoded = jwt.verify(token, config.get('secretOrKey'));
    const userId = decoded.id;

    try {
      const result = await pushToBitbucket(sanitizedNamespace, filePaths);

      // Save the deployment information with status 'passed'
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
        $push: { myDeployments: deployment._id }
      });

      res.status(200).send(result);
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
        $push: { myDeployments: deployment._id }
      });

      console.error(error);
      res.status(500).json({ message: `An error occurred during git push: ${error.message}` });
    }
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.error(error);
  }
};
// Function to generate the Kubernetes Pod YAML file
const generatePodYaml = (
  podName,
  image,
  ports,
  cpuLimit,
  cpuRequest,
  memoryLimit,
  memoryRequest
) => {
  const labels = {
    app: "my-app",
    tier: "frontend",
  };

  const resources = `
  resources:
  limits:
    cpu: "${cpuLimit}"
    memory: "${memoryLimit}"
  requests:
    cpu: "${cpuRequest}"
    memory: "${memoryRequest}"
  `;

  const portsWithContainerPort = ports
    .map((port) => `- containerPort: ${port}`)
    .join("\n");

  const yamlContent = `
  apiVersion: v1
  kind: Pod
  metadata:
    name: ${podName}
    labels:
      ${Object.entries(labels)
        .map(([key, value]) => `    ${key}: ${value}`)
        .join("\n")}
  spec:
    containers:
    - name: ${podName}
      image: ${image}
      ports:
      ${portsWithContainerPort}
      ${resources}
    restartPolicy: Never
  `;

  return yamlContent;
};

// Function to generate the Kubernetes ReplicatSet YAML file
const generateReplicatSetYaml = (
  ReplicaSetName,
  ReplicaSetnbr,
  image,
  ports,
  cpuLimit,
  cpuRequest,
  memoryLimit,
  memoryRequest
) => {
  const labels = {
    app: "my-app",
    tier: "frontend",
  };

  const resources = `
resources:
limits:
  cpu: "${cpuLimit}"
  memory: "${memoryLimit}"
requests:
  cpu: "${cpuRequest}"
  memory: "${memoryRequest}"
`;

  const portsWithContainerPort = ports
    .map((port) => `- containerPort: ${port}`)
    .join("\n");

  const yamlContent = `
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: ${ReplicaSetName}
spec:
  replicas: ${ReplicaSetnbr}
  selector: 
    matchLabels: 
      app : ${ReplicaSetName}
  template:
    metadata:
      labels:
        app: ${ReplicaSetName}
    spec:
      containers:
      - name: ${ReplicaSetName}
        image: ${image}
        ports:
        ${portsWithContainerPort}
        ${resources}
`;

  return yamlContent;
};
// Function to generate the Kubernetes Deployment YAML file
const generateDeploymentYaml = (
  deploymentName,
  image,
  ports,
  cpuLimit,
  cpuRequest,
  memoryLimit,
  memoryRequest,
  envFromConfigMap,
  volumeMounts,
  volumes,
  labels
) => {
  const resources = `
resources:
limits:
  cpu: "${cpuLimit}"
  memory: "${memoryLimit}"
requests:
  cpu: "${cpuRequest}"
  memory: "${memoryRequest}"
`;

  const portsWithContainerPort = ports
    .map((port) => `- containerPort: ${port}`)
    .join("\n");

  const envFromConfigMapEntries = envFromConfigMap
    ? `- configMapRef:\n  name: ${envFromConfigMap}`
    : "";

  const volumeMountsWithPersistentVolumeClaim = volumeMounts
    .map(
      (volumeMount) =>
        `- mountPath: ${volumeMount.mountPath}\n  name: ${volumeMount.name}`
    )
    .join("\n");

  const volumesEntries = volumes
    .map(
      (volume) =>
        `- name: ${volume.name}\npersistentVolumeClaim:\n  claimName: ${volume.claimName}`
    )
    .join("\n");

  const yamlContent = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${deploymentName}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${labels.app}
  template:
    metadata:
      labels:
        app: ${labels.app}
    spec:
      containers:
      - name: ${deploymentName}
        image: "${image}"
        imagePullPolicy: IfNotPresent
        ports:
        ${portsWithContainerPort}
        ${resources}
        envFrom:
        ${envFromConfigMapEntries}
        volumeMounts:
        ${volumeMountsWithPersistentVolumeClaim}
      volumes:
      ${volumesEntries}
`;

  return yamlContent;
};

// Endpoint to generate and save the Pod YAML file
exports.generatePod = async (req, res) => {
  try {
    const {
      podName,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      label,
      tierlbl,
    } = req.body;

    // Validate inputs
    if (
      !podName ||
      !image ||
      !Array.isArray(ports) ||
      !cpuLimit ||
      !cpuRequest ||
      !memoryLimit ||
      !memoryRequest ||
      !label ||
      !tierlbl
    ) {
      return res
        .status(400)
        .send("Missing required fields in the request body");
    }

    const podYaml = generatePodYaml(
      podName,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      label,
      tierlbl
    );

    const tempFilePath = path.join(__dirname, "temp", `${podName}.yaml`);

    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(tempFilePath, podYaml);

    res.status(200).send("Pod YAML file generated and saved.");
  } catch (error) {
    res.status(500).send("Failed to generate Pod YAML.");
  }
};

// Endpoint to generate and save the ReplicatSet YAML file
exports.generateReplicatSet = async (req, res) => {
  try {
    const {
      ReplicaSetName,
      ReplicaSetnbr,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      label,
      tierlbl,
    } = req.body;

    // Validate inputs
    if (
      !ReplicaSetName ||
      !ReplicaSetnbr ||
      !image ||
      !Array.isArray(ports) ||
      !cpuLimit ||
      !cpuRequest ||
      !memoryLimit ||
      !memoryRequest ||
      !label ||
      !tierlbl
    ) {
      return res
        .status(400)
        .send("Missing required fields in the request body");
    }

    // Generate the ReplicatSet YAML content
    const ReplicatSetYaml = generateReplicatSetYaml(
      ReplicaSetName,
      ReplicaSetnbr,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      label,
      tierlbl
    );

    // Define the temporary file path
    const tempFilePath = path.join(__dirname, "temp", `${ReplicaSetName}.yaml`);

    // Ensure the temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save the ReplicatSet YAML file
    fs.writeFileSync(tempFilePath, ReplicatSetYaml);

    // Respond with success message
    res.status(200).send("ReplicatSet YAML file generated and saved.");
  } catch (error) {
    res.status(500).send("Failed to generate ReplicatSet YAML.");
  }
};
// Endpoint to generate and save the Deployment YAML file
exports.generateDeployment = async (req, res) => {
  try {
    const {
      deploymentName,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      envFromConfigMap,
      volumeMounts,
      volumes,
      labels,
    } = req.body;

    // Validate inputs
    if (
      !deploymentName ||
      !image ||
      !Array.isArray(ports) ||
      !cpuLimit ||
      !cpuRequest ||
      !memoryLimit ||
      !memoryRequest ||
      !envFromConfigMap ||
      !volumeMounts ||
      !volumes ||
      !labels
    ) {
      return res
        .status(400)
        .send("Missing required fields in the request body");
    }

    // Generate the Deployment YAML content
    const deploymentYaml = generateDeploymentYaml(
      deploymentName,
      image,
      ports,
      cpuLimit,
      cpuRequest,
      memoryLimit,
      memoryRequest,
      envFromConfigMap,
      volumeMounts,
      volumes,
      labels
    );

    const tempFilePath = path.join(__dirname, "temp", `${deploymentName}.yaml`);
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    fs.writeFileSync(tempFilePath, deploymentYaml);
    res.status(200).send("Deployment YAML file generated and saved.");
  } catch (error) {
    res.status(500).send("Failed to generate Deployment YAML.");
  }
};

// Function to generate a directory for Kubernetes files
const generateK8sDir = () => {
  const dir = path.join(__dirname, "k8s");
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
      if (stderr && !stderr.includes("AlreadyExists")) {
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
  // Check if filePath is a string; if not, throw an error or handle accordingly
  if (typeof filePath !== "string") {
    throw new Error("filePath must be a string");
  }

  // Ensure the file path is correctly formatted for Windows
  const correctedPath = filePath.replace(/\\/g, "/");

  return new Promise((resolve, reject) => {
    exec(
      `kubectl apply -f "${correctedPath}" -n ${namespace}`,
      (error, stdout, stderr) => {
        if (error) {
          return reject(`error: ${error.message}`);
        }
        if (stderr) {
          return reject(`stderr: ${stderr}`);
        }
        resolve(stdout);
      }
    );
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
      return res
        .status(400)
        .json({
          msg: "Invalid input. 'files' should be an array of file paths.",
        });
    }

    const sanitizedNamespace = namespace
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/^-+|-+$/g, "");

    try {
      // await createNamespace(sanitizedNamespace);
      await applyK8sFilesInSequence(files, sanitizedNamespace); // Ensure this function is called with the correct arguments

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

      return res
        .status(200)
        .json({ msg: "Kubernetes files applied successfully." });
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
      console.log(error);
      return res.status(500).json({ errors: error.message });
    }
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.log(error);
  }
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
        ports:
        - containerPort: ${port}
`;

  return serviceYaml + deploymentYaml;
};

exports.generateDataBaseFile = async (req, res) => {
  const { dbType, serviceName, dbName, port, envVariables, namespace } =
    req.body;
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
    const k8sDir = generateK8sDir();
    const deploymentFilePath = path.join(
      k8sDir,
      `${serviceName}-deployment.yaml`
    );
    fs.writeFileSync(deploymentFilePath, deploymentYaml);

    // Apply the generated deployment file using kubectl
    res
      .status(201)
      .json({
        msg: "Database deployment file generated and applied",
        deploymentFilePath,
      });
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.log(error);
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

  let envSection = "";
  if (envVariables && envVariables.length > 0) {
    envSection = `
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
      .join("\n")}
`;
  }

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
    envVariables,
    expose,
    host,
    namespace,
    dockerUsername,
    dockerPassword,
    dockerEmail,
    imagePullSecretName,
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

    const deploymentYaml = generateSpringBootDeployment(
      serviceName,
      port,
      image,
      envVariables,
      namespace,
      imagePullSecretName
    );
    const k8sDir = generateK8sDir();
    const deploymentFilePath = path.join(
      k8sDir,
      `${serviceName}-deployment.yaml`
    );
    fs.writeFileSync(deploymentFilePath, deploymentYaml);

    let ingressFilePath = null;

    if (expose) {
      ingressFilePath = path.join(k8sDir, "ingress.yaml");
      let ingressYaml = "";

      if (fs.existsSync(ingressFilePath)) {
        const existingIngress = fs.readFileSync(ingressFilePath, "utf8");
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

      fs.writeFileSync(ingressFilePath, ingressYaml);
    }

    res.status(201).json({
      msg: "Deployment files generated and applied",
      deploymentFilePath,
      ingressFilePath,
    });
  } catch (error) {
    res.status(500).json({ errors: error.message });
    console.log(error);
  }
};

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

  const ingressWithNamespace = existingIngress.replace(
    /namespace: .+/,
    `namespace: ${namespace}`
  );

  const splitIngress = ingressWithNamespace.split("rules:");
  return `${splitIngress[0]}rules:${splitIngress[1]}${newRule}`;
};
