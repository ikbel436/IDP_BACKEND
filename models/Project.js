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
  ArgoCD : String,
  DBType: String,
  DockerImage : [], 
  Status : String,
  SonarQube : String,
  myprojectDepl: [
    {
      type: ObjectId,
      ref: "projectDepl",
    },
  ],

});

module.exports = Project = mongoose.model("project", projectSchema);
