const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const gitlabRoutes = require('./routes/gitlabRoute');
const TerraformRoutes = require ('./routes/terraformRoute');
const AuthRoutes = require ('./routes/authRoute');
const connectDB = require('./config/DBConnect');
const { Server } = require('http');
app.use(bodyParser.json());


// Use the routes
app.use('/terraform', TerraformRoutes);
app.use('/gitlab', gitlabRoutes);
app.use('/auth',AuthRoutes)

// Start the server
const PORT = process.env.PORT || 3000;
connectDB();
app.listen(PORT, () => console.log(`Server running on port ${PORT} , GOING TO THE MOON 🚀 !`));


