const mongoose = require('mongoose');

const repositorySchema = new mongoose.Schema({
  name: String,
  description: String,
  createdAt: Date,
  lastUpdated: Date,
  cloneUrl: String,
  language: String,
  ArgoCD : String,
  DBType: String,
  DockerImage : String, 
  Status : String,
  SonarQube : String
});

module.exports = Repositories = mongoose.model("repositories", repositorySchema);
