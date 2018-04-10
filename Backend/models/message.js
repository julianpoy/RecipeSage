var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Message = new Schema({
  from: {
    type: String,
    ref: 'User'
  },
  to: {
    type: String,
    ref: 'User'
  },
  body: {
    type: String
  },
  recipe: {
    type: String,
    ref: 'Recipe'
  },
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('Message', Message);
