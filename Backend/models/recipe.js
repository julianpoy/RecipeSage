var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Recipe = new Schema({
  accountId: {
    type: String
  },
	title: {
    type: String
  },
  description: {
    type: String
  },
  yield: {
    type: String
  },
  activeTime: {
    type: String
  },
  totalTime: {
    type: String
  },
  source: {
    type: String
  },
  url: {
    type: String
  },
  notes: {
    type: String
  },
  ingredients: {
    type: String
  },
  instructions: {
    type: String
  },
  image: {
    // Multer-S3 Object    
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
