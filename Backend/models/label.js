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
  dumps: [{
    type: String,
    ref: 'Dump'
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
