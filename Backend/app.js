var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var fs = require('fs');

if (fs.existsSync("./config/config.json")) {
    console.log("config.json found");
} else {
    var content = fs.readFileSync('./config/config-template.json');
    fs.writeFileSync('./config/config.json', content);
    console.log("config.json initialized");
}
var appConfig = require('./config/config.json');

// Database and schemas
var mongo = require('mongodb');
var db = require('./models/db');
var userSchema = require('./models/user');
var sessionSchema = require('./models/session');
var recipeSchema = require('./models/recipe');
var labelSchema = require('./models/label');

// Routes
var index = require('./routes/index');
var users = require('./routes/users');
var recipes = require('./routes/recipes');

var app = express();

app.options('*', cors());
app.use(cookieParser());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var frontendDir = appConfig.frontendDir || '../Frontend/www';
app.use(express.static(path.join(__dirname, frontendDir)));

app.use('/', index);
app.use('/users', users);
app.use('/recipes', recipes);

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
