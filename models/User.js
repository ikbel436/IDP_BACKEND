const c = require("config");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const userSchema = mongoose.Schema({
  name: String,
  email: String,
  phoneNumber: String,
  countryCode: String,
  password: String,
  address: String,
  birthDate: String,
  codePostal: String,
  country: String,
  city: String,
  Role: {
    type: String,
    default: "User",
  },

  createdAt: {
    type: Date,
    default: new Date(),
  },
  image: {
    public_id: { type: String },
    url: { type: String },
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
  myRepo: [
    {
      type: ObjectId,
      ref: "repositories",
    },
  ],
  Bundles: [
    {
      type: ObjectId,
      ref: "bundle",
    },
  ],
  resetLink: {
    data: String,
    default: "",
  },

  status: {
    type: String,
    default: "online",
  },
  description: {
    type: String,
    default: "",
  },
});

module.exports = User = mongoose.model("user", userSchema);
