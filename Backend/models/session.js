var mongoose = require('mongoose');
var Session = new mongoose.Schema({
    accountId: {
        type: String
    },
    type: {
        type: String
    },
    token: {
        type: String
    },
    created: {
        type: Date,
        default: Date.now
    }
});

mongoose.model('Session', Session);
