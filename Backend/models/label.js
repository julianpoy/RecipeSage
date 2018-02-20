var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Label = new Schema({
  accountId: {
    type: String,
    ref: 'User'
  },
  title: {
    type: String
  },
  recipes: [{
    type: String,
    ref: 'Recipe'
  }],
  created: {
    type: Date,
    default: Date.now
  },
  updated: {
    type: Date,
    default: Date.now
  }
});

mongoose.model('Label', Label);
