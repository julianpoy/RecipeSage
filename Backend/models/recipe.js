var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Recipe = new Schema({
  accountId: {
    type: String
  },
	title: {
    type: String
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

mongoose.model('Recipe', Recipe);
