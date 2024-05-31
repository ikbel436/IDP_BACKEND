const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const gitlabGenRoutes = require('./routes/GitlabGenRoute');
const GitLabRoute = require('./routes/gitlabRoute');
const TerraformRoutes = require('./routes/terraformRoute');
const AuthRoutes = require('./routes/authRoute');
const connectDB = require('./config/DBConnect');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const projectRouter = require("./routes/projectRoutes");
const K8Route = require("./routes/K8Route");
const BitbucketRoute = require('./routes/BitbucketRoute');
const azureResourcesRoute = require('./routes/AzureResourcesRoute')
const OAuthRoute = require("./routes/OAuthRoute");
const { specs, swaggerUi } = require("./swagger");
const ReposRoute = require('./routes/ReposRoute');
const corsOptions = {
  origin: 'http://localhost:4200',
  credentials: true 
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
// Use the routes
app.use("/terraform", TerraformRoutes);
app.use("/gitlab", gitlabGenRoutes);
app.use("/auth", AuthRoutes);
app.use("", projectRouter);
app.use("/k8", K8Route);
app.use("/connect", BitbucketRoute);
app.use("/OAuth", OAuthRoute);
app.use('/azure', azureResourcesRoute);
app.use('/gitlab', GitLabRoute);
app.use('/Repos',ReposRoute)




// Start the server
const PORT = process.env.PORT || 3000;
connectDB();
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}, GOING TO THE MOON 🚀!`)
);
