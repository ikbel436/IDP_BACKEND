const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const projectSchema = mongoose.Schema({
  name: String,

  reference: String,

  description: String,

  createdAt: {
    type: Date,
    default: new Date(),
  },
  image: {
    public_id: { type: String },
    url: { type: String },
  },
});

module.exports = Project = mongoose.model("project", projectSchema);
