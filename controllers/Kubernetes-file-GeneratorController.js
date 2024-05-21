const fs = require("fs");
const path = require("path");

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

    // Generate the Pod YAML content
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

    // Define the temporary file path
    const tempFilePath = path.join(__dirname, "temp", `${podName}.yaml`);

    // Ensure the temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save the Pod YAML file
    fs.writeFileSync(tempFilePath, podYaml);

    // Respond with success message
    res.status(200).send("Pod YAML file generated and saved.");
  } catch (error) {
    console.error("Error generating Pod YAML:", error);
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
    console.error("Error generating ReplicatSet YAML:", error);
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

    // Define the temporary file path
    const tempFilePath = path.join(__dirname, "temp", `${deploymentName}.yaml`);

    // Ensure the temp directory exists
    const tempDir = path.dirname(tempFilePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Save the Deployment YAML file
    fs.writeFileSync(tempFilePath, deploymentYaml);

    // Respond with success message
    res.status(200).send("Deployment YAML file generated and saved.");
  } catch (error) {
    console.error("Error generating Deployment YAML:", error);
    res.status(500).send("Failed to generate Deployment YAML.");
  }
};
