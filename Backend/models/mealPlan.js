var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MealPlan = new Schema({
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
    date: {
      type: Date,
      default: Date.now
    },
    created: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: String,
      ref: 'User'
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

mongoose.model('MealPlan', MealPlan);
