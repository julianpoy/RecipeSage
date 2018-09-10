var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var fs = require('fs');
var Raven = require('raven');
var compression = require('compression');

if (fs.existsSync("./config/config.json")) {
  console.log("config.json found");
} else {
  var content = fs.readFileSync('./config/config-template.json');
  fs.writeFileSync('./config/config.json', content);
  console.log("config.json initialized");
}
var appConfig = require('./config/config.json');

// OLD Database and schemas (mongo)
var mongo = require('mongodb');
var db = require('./mongoose-models/db');
var userSchema = require('./mongoose-models/user');
var sessionSchema = require('./mongoose-models/session');
var recipeSchema = require('./mongoose-models/recipe');
var labelSchema = require('./mongoose-models/label');
var messageSchema = require('./mongoose-models/message');
var shoppingListSchema = require('./mongoose-models/shoppingList');
var mealPlanSchema = require('./mongoose-models/mealPlan');

var app = express();

var User = require('./models').User;
var FCMToken = require('./models').FCMToken;
var Session = require('./models').Session;
var Recipe = require('./models').Recipe;
var Label = require('./models').Label;
var Message = require('./models').Message;
var ShoppingList = require('./models').ShoppingList;
var ShoppingListItem = require('./models').ShoppingListItem;
var MealPlan = require('./models').MealPlan;
var MealPlanItem = require('./models').MealPlanItem;

var mongoose = require('mongoose');
var mongooseUser = mongoose.model('User');
var mongooseSession = mongoose.model('Session');
var mongooseRecipe = mongoose.model('Recipe');
var mongooseLabel = mongoose.model('Label');
var mongooseMessage = mongoose.model('Message');
var mongooseShoppingList = mongoose.model('ShoppingList');
var mongooseMealPlan = mongoose.model('MealPlan');

var usersByMongoId = {};
var recipesByMongoId = {};

function migrateUsers(cb) {
  mongooseUser.find().lean().then(function(users) {
    users.forEach(function(user) {

      User.create({
        name: user.name,
        email: user.email,
        passwordHash: user.password,
        passwordSalt: user.salt,
        passwordVersion: user.passwordVersion,
        lastLogin: user.lastLogin,
        createdAt: user.created,
        updatedAt: user.updated
      })
      .then(newUser => {
        usersByMongoId[user._id] = newUser;

        if (user.fcmTokens && user.fcmTokens.length > 0) {
          user.fcmTokens.forEach(function(token) {
            FCMToken.create({
              userId: newUser.id,
              token: token
            }).then(fcmToken => {

            }).catch(error => {
              console.log("ERROR!", error);
            });
          });
        }
      })
      .catch(error => {
        console.log("user fail!", error);
      });
    });
  });
}

function migrateRecipes(cb) {
  mongooseRecipe.find().lean().then(function(recipes) {
    recipes.forEach(function(recipe) {
      console.log(recipe.fromUser)
      Recipe.create({
        userId: usersByMongoId[recipe.accountId].id,
        title: recipe.title,
        description: recipe.description,
        yield: recipe.yield,
        activeTime: recipe.activeTime,
        totalTime: recipe.totalTime,
        source: recipe.source,
        url: recipe.url,
        notes: recipe.notes,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        image: recipe.image,
        folder: recipe.folder,
        fromUserId: (usersByMongoId[recipe.fromUser] || {}).id,
        createdAt: recipe.created,
        updatedAt: recipe.updated
      })
      .then(newRecipe => {
        recipesByMongoId[recipe._id] = newRecipe;
      })
      .catch(error => {
        console.log("user fail!", error);
      });
    });
  });
}

function migrateLabels(cb) {
  mongooseLabel.find().lean().then(function(labels) {
    labels.forEach(function(label) {
      Label.create({
        userId: usersByMongoId[label.accountId].id,
        title: label.title,
        createdAt: label.created,
        updatedAt: label.updated
      })
      .then(newLabel => {
        label.recipes.forEach(function(labelRecipeId) {
          newLabel.addRecipes([recipesByMongoId[labelRecipeId].id]).then(test => {}).catch(error => {
            console.log("error!", error)
          });
        });
      })
      .catch(error => {
        console.log(error)
      });
    });
  });
}

function migrateMessages(cb) {
  mongooseMessage.find().lean().then(function(messages) {
    messages.forEach(function(message) {
      Message.create({
        fromUserId: (usersByMongoId[message.from] || {}).id,
        toUserId: (usersByMongoId[message.to] || {}).id,
        body: message.body,
        recipeId: (recipesByMongoId[message.recipe] || {}).id,
        originalRecipeId: (recipesByMongoId[message.originalRecipe] || {}).id,
        createdAt: message.created,
        updatedAt: message.updated
      })
      .then(newMessage => {

      })
      .catch(error => {
        console.log(error)
      });
    });
  });
}

function migrateShoppingLists(cb) {
  mongooseShoppingList.find().lean().then(function(lists) {
    lists.forEach(function(list) {
      ShoppingList.create({
        userId: usersByMongoId[list.accountId].id,
        title: list.title,
        createdAt: list.created,
        updatedAt: list.updated
      })
      .then(newList => {
        list.collaborators.forEach(function (collaboratorUserId) {
          newList.addCollaborator([usersByMongoId[collaboratorUserId].id]).then(test => { }).catch(error => {
            console.log("error!", error)
          });
        });

        list.items.forEach(function (item) {
          ShoppingListItem.create({
            userId: usersByMongoId[item.createdBy].id,
            shoppingListId: newList.id,
            title: item.title,
            completed: item.completed,
            recipeId: (recipesByMongoId[item.recipe] || {}).id,
            createdAt: item.created,
            updatedAt: item.updated
          }).then(fcmToken => {

          }).catch(error => {
            console.log("ERROR!", error);
          });
        });
      })
      .catch(error => {
        console.log(error)
      });
    });
  });
}

var t = 0;
var a = 500;
setTimeout(migrateUsers, t += a);
setTimeout(migrateRecipes, t += a);
setTimeout(migrateLabels, t += a);
setTimeout(migrateMessages, t += a);
setTimeout(migrateShoppingLists, t += a);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
