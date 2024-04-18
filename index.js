const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const gitlabRoutes = require('./routes/gitlab-routes');
const TerraformRoutes = require ('./routes/terraform-routes');
app.use(bodyParser.json());

// Use the routes
app.use('/terraform', TerraformRoutes);
app.use('/gitlab', gitlabRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} , GOING TO THE MOON 🚀 !`));



