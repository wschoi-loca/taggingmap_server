const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
    jsonData: {
        type: Object,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    timestamp: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('Page', PageSchema);