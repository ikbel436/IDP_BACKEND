const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);

const deviceInfoSchema = new mongoose.Schema({
  device: String,
  os: String,
  browser: String,
  userAgent: String
}, { _id: false });

const trustedDeviceSchema = new mongoose.Schema({
  deviceId: String,
  expiresAt: Date,
  deviceInfo: deviceInfoSchema,
}, { _id: false });

const notificationSchema = new mongoose.Schema({
  id: String,
  title: String,
  description: String,
  time: Date,
  read: { type: Boolean, default: false }
}, { _id: false });

const userSchema = new mongoose.Schema({
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
  myDeployments: [
    {
      type: ObjectId,
      ref: "Deployment",
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
  trustedDevices: [trustedDeviceSchema],
  otp: { type: String, default: null },
  verified : Boolean,
  notifications: [notificationSchema]

});


module.exports = User = mongoose.model("user", userSchema);
