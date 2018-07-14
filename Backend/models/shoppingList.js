var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Recipe = new Schema({
  accountId: {
    type: String,
    ref: 'User'
  },
  collaborators: [{
    type: String,
    ref: 'User'
  }],
  title: {
    type: String
  },
  items: [{
    title: {
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
    createdBy: {
      type: String,
      ref: 'User'
    },
    completed: {
      type: Boolean,
      default: false
    }
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

mongoose.model('Recipe', Recipe);
