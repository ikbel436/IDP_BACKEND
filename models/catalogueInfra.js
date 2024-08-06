const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    fileUrl: { type: String, required: true },
    steps: { type: [String], required: true },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

module.exports = mongoose.model('Infrastructure', cardSchema);
