const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { ObjectId } = mongoose.Schema.Types;
const DeploymentSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  namespace:{
type: String,
required: true
  },
  bundle: [{
    type: ObjectId,
    ref: 'bundle',
    required: true
  }],

  status: {
    type: String,
    enum: ['passed', 'failed'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Deployment', DeploymentSchema);