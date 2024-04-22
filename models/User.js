const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const userSchema = mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: Number,
  password: String,
  createdAt: {
    type: Date,
    default: new Date(),
  },
  image: {
    public_id: { type: String },
    url: { type: String },
  },
  Role: {
    type: String,
    default: "User",
  },
  Fonction: {
    type: String,
    default: "",
  },
  myProject: [
    {
      type: ObjectId,
      ref: "project",
    },
  ],
  resetLink: {
    data: String,
    default: "",
  },
});

module.exports = User = mongoose.model("user", userSchema);
