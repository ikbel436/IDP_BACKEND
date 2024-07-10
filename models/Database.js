const mongoose = require('mongoose');
const { Schema } = mongoose;

const EnvVariableSchema = new Schema({
  key: String,
  value: String,
});

const DatabaseConfigSchema = new Schema({
  type: String,
  serviceName: String,
  port: Number,
  envVariables: [EnvVariableSchema], 
});

const DatabaseConfig = mongoose.model('databaseConfig', DatabaseConfigSchema);

module.exports = DatabaseConfig;
