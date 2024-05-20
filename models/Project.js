const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const projectSchema = mongoose.Schema({
  name: String,

  reference: String,
  provider : String,
  lien : String,
  description: String,

  createdAt: {
    type: Date,
    default: new Date(),
  },
  fileUrl: String,
  backendDockerImage: String, // Docker Hub image name for the backend
  frontendDockerImage: String, // Docker Hub image name for the frontend
  databaseType: {
    type: String,
    enum: ['MySQL', 'MongoDB', 'PostgreSQL', 'SQLite', 'Other'], // Define acceptable values
  }
});

module.exports = Project = mongoose.model("project", projectSchema);
