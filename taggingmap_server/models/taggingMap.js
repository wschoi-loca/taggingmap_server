const mongoose = require('mongoose');

const taggingMapSchema = new mongoose.Schema({
    TIME: {
        type: String,
        required: true,
    },
    EVENTNAME: {
        type: String,
        required: true,
    },
    PAGETITLE: {
        type: String,
        required: true,
    },
    URL: {
        type: String,
        required: true,
    },
    eventParams: {
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

module.exports = mongoose.model('taggingMap', taggingMapSchema);