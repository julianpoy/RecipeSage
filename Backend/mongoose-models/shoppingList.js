var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ShoppingList = new Schema({
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
    reference: {
      type: String
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

mongoose.model('ShoppingList', ShoppingList);
