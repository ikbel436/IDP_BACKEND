const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const projectSchema = mongoose.Schema({
  name: String,
  description: String,
  createdAt: Date,
  lastUpdated: Date,
  cloneUrl: String,
  language: String,
  DBType: String,
  DockerImage : String, 
  Status : String,
  SonarQube : String,

});

module.exports = Project = mongoose.model("project", projectSchema);
