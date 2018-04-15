var mongoose = require('mongoose');
var config = require('../config/config.json');

mongoose.connect('mongodb://localhost/' + (config.db || 'chefBook'), {
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
});
