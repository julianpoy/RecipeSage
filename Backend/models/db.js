var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/chefBook', {
  keepAlive: true,
  reconnectTries: Number.MAX_VALUE
});
