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

  createdAt: {
    type: Date,
    default: new Date(),
  },
  // backendDockerImage: String, 
  // frontendDockerImage: String, 
  // databaseType: {
  //   type: String,
  //   enum: ["MySQL", "MongoDB", "PostgreSQL", "SQLite", "Other"], 
  // },
});

module.exports = Project = mongoose.model("project", projectSchema);
