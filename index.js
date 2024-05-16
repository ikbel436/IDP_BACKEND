const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const gitlabRoutes = require('./routes/gitlabRoute');
const TerraformRoutes = require ('./routes/terraformRoute');
const AuthRoutes = require ('./routes/authRoute');
const connectDB = require('./config/DBConnect');
const { Server } = require('http');
const cors = require("cors");
const cookieParser = require('cookie-parser');
const projectRouter = require('./routes/projectRoutes');
const K8Route = require('./routes/K8Route');



const corsOptions = {
    origin: 'http://localhost:4200',
    credentials: true // Allow cookies to be sent with requests
  };

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());



// Use the routes
app.use('/terraform', TerraformRoutes);
app.use('/gitlab', gitlabRoutes);
app.use('/auth',AuthRoutes)
app.use('/project', projectRouter)
app.use('/k8', K8Route)





// Start the server
const PORT = process.env.PORT || 3000;
connectDB();
app.listen(PORT, () => console.log(`Server running on port ${PORT} , GOING TO THE MOON 🚀 !`));

