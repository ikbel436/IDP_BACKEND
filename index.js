// index.js
const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/DBConnect");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware setup
const corsOptions = {
  origin: "http://localhost:4200",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

// Import routes
const gitlabGenRoutes = require("./routes/GitlabGenRoute");
const GitLabRoute = require("./routes/gitlabRoute");
const TerraformRoutes = require("./routes/terraformRoute");
const AuthRoutes = require("./routes/authRoute");
const projectRouter = require("./routes/projectRoutes");
const K8Route = require("./routes/K8Route");
const BitbucketRoute = require("./routes/BitbucketRoute");
const azureResourcesRoute = require("./routes/AzureResourcesRoute");
const OAuthRoute = require("./routes/OAuthRoute");
const { specs, swaggerUi } = require("./swagger");
const ReposRoute = require("./routes/ReposRoute");
const cloudServiceRoutes = require("./routes/CloudServiceRoutes");
const bundleRoutes = require("./routes/bundleRoutes");
const workflow = require("./routes/workflowRoutes");
const actionRoute = require("./routes/actionRoute");
const deploymentRoutes = require("./routes/DeploymentRoute");
const otpRoute = require("./routes/otpRoute");
const infrastructureRoutes = require("./routes/infrastructureRoute");
const projectDepl = require("./routes/projectDeplRoutes");
const notificationRoutes = require("./routes/notificationsRoute");
const axios = require("axios");

// Route setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use("/terraform", TerraformRoutes);
app.use("/gitlab", gitlabGenRoutes);
app.use("/auth", AuthRoutes);
app.use("", projectRouter);
app.use("/k8", K8Route);
app.use("/connect", BitbucketRoute);
app.use("/OAuth", OAuthRoute);
app.use("/azure", azureResourcesRoute);
app.use("/gitlab", GitLabRoute);
app.use("/Repos", ReposRoute);
app.use("/api/cloudservices", cloudServiceRoutes);
app.use("/Bundle", bundleRoutes);
app.use("/pipCI", workflow);
app.use("/api/actions", actionRoute);
app.use("/depl", deploymentRoutes);
app.use("/otp", otpRoute);
app.use("/projectDepl", projectDepl);
app.use("/infra", infrastructureRoutes);
app.use("/notifications", notificationRoutes);

app.get('/api/docker-tags/:namespace/:repository', async (req, res) => {
  const { namespace, repository } = req.params;
  try {
    const response = await axios.get(`https://hub.docker.com/v2/repositories/${namespace}/${repository}/tags`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching Docker image tags:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Something went wrong; please try again later.' });
  }
});

// Broadcast function
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// Ensure the WebSocket server instance is accessible globally
global.wss = wss;

const PORT = process.env.PORT || 3000;
connectDB();

server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}, GOING TO THE MOON 🚀!`)
);

module.exports = server;
