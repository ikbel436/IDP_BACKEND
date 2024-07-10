const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const projectDeplschema = mongoose.Schema({
  Resigtrytype: String,
  serviceName: String,
  port: Number,
  Key: [
    {
      type: String,
      default: "",
    },
  ],
  Value: [
    {
      type: String,
      default: "",
    },
  ],
});

module.exports = Bundle = mongoose.model("projectDepl", projectDeplschema);
