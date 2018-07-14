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

Raven.config(appConfig.sentry.dsn, {
  environment: appConfig.environment,
  release: '1.1.1'
}).install();

// Database and schemas
var mongo = require('mongodb');
var db = require('./models/db');
var userSchema = require('./models/user');
var sessionSchema = require('./models/session');
var recipeSchema = require('./models/recipe');
var labelSchema = require('./models/label');
var messageSchema = require('./models/message');
var shoppingListSchema = require('./models/shoppingList');

// Routes
var index = require('./routes/index');
var users = require('./routes/users');
var recipes = require('./routes/recipes');
var labels = require('./routes/labels');
var messages = require('./routes/messages');
var shoppingLists = require('./routes/shoppingLists');
var print = require('./routes/print');
var grip = require('./routes/grip');

var app = express();
app.use(Raven.requestHandler());

app.use(compression());

app.options('*', cors());
app.use(cookieParser());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '4MB'}));
app.use(bodyParser.urlencoded({ limit: '4MB', extended: false }));
app.use(cookieParser());

var frontendDir = appConfig.frontendDir || '../Frontend/www';
app.use(express.static(path.join(__dirname, frontendDir)));

app.use('/', index);
app.use('/users', users);
app.use('/recipes', recipes);
app.use('/labels', labels);
app.use('/messages', messages);
app.use('/shoppingLists', shoppingLists);
app.use('/print', print);
app.use('/grip', grip);

app.use(Raven.errorHandler());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

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
