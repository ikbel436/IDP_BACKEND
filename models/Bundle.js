const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const bundleSchema = mongoose.Schema({
  name: String,
  description: String,
  createdAt: Date,
  Projects: [
    {
      type: ObjectId,
      ref: "project",
    },
  ],

});

module.exports = Bundle = mongoose.model("bundle", bundleSchema);
