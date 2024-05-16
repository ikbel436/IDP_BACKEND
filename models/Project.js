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
});

module.exports = Project = mongoose.model("project", projectSchema);
