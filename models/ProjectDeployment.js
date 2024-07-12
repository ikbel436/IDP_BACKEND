const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
mongoose.set("strictQuery", false);
const { Schema } = mongoose;


const EnvVariableSchema = new Schema({
  key: String,
  value: String,
});

const projectDeplschema = mongoose.Schema({
  image: String,
  expose: Boolean,
  Resigtrytype: String,
  serviceName: String,
  port: Number,
  envVariables: [EnvVariableSchema], 

});

module.exports = ProjectDeploymentConfig = mongoose.model("projectDepl", projectDeplschema);
