const fs = require('fs');
const path = require('path');

// Function to generate the Kubernetes Pod YAML file
const generatePodYaml = (podName, image, ports, cpuLimit, cpuRequest, memoryLimit, memoryRequest) => {
    const labels = {
      app: 'my-app',
      tier: 'frontend'
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
  
    const portsWithContainerPort = ports.map(port => `- containerPort: ${port}`).join('\n');
  
    const yamlContent = `
  apiVersion: v1
  kind: Pod
  metadata:
    name: ${podName}
    labels:
      ${Object.entries(labels).map(([key, value]) => `    ${key}: ${value}`).join('\n')}
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
  

// Endpoint to generate and save the Pod YAML file
// exports.generatePod = async (req, res) => {
//     try {
//       const { podName, image, ports, cpuLimit, cpuRequest, memoryLimit, memoryRequest , label, tierlbl } = req.body;
  
//       // Validate inputs
//       if (!podName ||!image ||!Array.isArray(ports) ||!cpuLimit ||!cpuRequest ||!memoryLimit ||!memoryRequest ||!label ||!tierlbl) {
//         return res.status(400).send('Missing required fields in the request body');
//       }
  
//       // Generate the Pod YAML content
//       const podYaml = generatePodYaml(podName, image, ports, cpuLimit, cpuRequest, memoryLimit, memoryRequest , label, tierlbl);
  
//       // Define the temporary file path
//       const tempFilePath = path.join(__dirname, 'temp', `${podName}.yaml`);
  
//       // Ensure the temp directory exists
//       const tempDir = path.dirname(tempFilePath);
//       if (!fs.existsSync(tempDir)) {
//         fs.mkdirSync(tempDir, { recursive: true });
//       }
  
//       // Save the Pod YAML file
//       fs.writeFileSync(tempFilePath, podYaml);
  
//       // Respond with success message
//       res.status(200).send('Pod YAML file generated and saved.');
//     } catch (error) {
//       console.error('Error generating Pod YAML:', error);
//       res.status(500).send('Failed to generate Pod YAML.');
//     }
//   };
exports.generatePod = async (req, res) => {
  try {
      const { podName, image, ports, cpuLimit, cpuRequest, memoryLimit, memoryRequest , label, tierlbl } = req.body;

      // Validate inputs
      if (!podName ||!image ||!Array.isArray(ports) ||!cpuLimit ||!cpuRequest ||!memoryLimit ||!memoryRequest ||!label ||!tierlbl) {
          return res.status(400).send('Missing required fields in the request body');
      }
      const fileName = `${podName}.yaml`;
      // Generate the Pod YAML content
      const podYaml = generatePodYaml(podName, image, ports, cpuLimit, cpuRequest, memoryLimit, memoryRequest , label, tierlbl);

      // Define the temporary file path
      const tempFilePath = path.join(__dirname, 'temp', fileName);

      // Ensure the temp directory exists
      const tempDir = path.dirname(tempFilePath);
      if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save the Pod YAML file
      fs.writeFileSync(tempFilePath, podYaml);

      // Set response headers for file download
      res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
      res.setHeader('Content-type', 'application/x-yaml');

      // Send the file as response
      res.download(tempFilePath, fileName, (err) => {
          if (err) {
              console.error('Error sending file:', err);
              res.status(500).send('Failed to download Pod YAML file.');
          } else {
              console.log('File sent successfully');
          }
      });
  } catch (error) {
      console.error('Error generating Pod YAML:', error);
      res.status(500).send('Failed to generate Pod YAML.');
  }
};
