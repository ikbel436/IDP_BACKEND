const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const projectSchema = mongoose.Schema({
  name: String,
  reference: String,
  provider: String,
  lien: String,
  description: String,

  createdAt: {
    type: Date,
    default: new Date(),
  },
  backendDockerImage: String, 
  frontendDockerImage: String, 
  databaseType: {
    type: String,
    enum: ["MySQL", "MongoDB", "PostgreSQL", "SQLite", "Other"], 
  },
});

module.exports = Project = mongoose.model("project", projectSchema);
