const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CloudServiceSchema = new Schema({
    provider: { type: String, required: true },
    serviceName: { type: String, required: true },
    serviceType: { type: String, required: true },
    location: { type: String, required: true },
    available: { type: Boolean, default: true },
    createdBy: { type: String, required: true } // storing the admin ID who created the service
});

module.exports = mongoose.model('CloudService', CloudServiceSchema);
