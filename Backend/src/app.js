require('./services/sentry-init.js');
const Sentry = require('@sentry/node');

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');

// Routes
var index = require('./routes/index');
var users = require('./routes/users');
var recipes = require('./routes/recipes');
var labels = require('./routes/labels');
var messages = require('./routes/messages');
var shoppingLists = require('./routes/shoppingLists');
var mealPlans = require('./routes/mealPlans');
var print = require('./routes/print');
var payments = require('./routes/payments');
var images = require('./routes/images');
var clip = require('./routes/clip');
var data = require('./routes/data');
var proxy = require('./routes/proxy');

var ws = require('./routes/ws');

var app = express();

var corsWhitelist = ['https://www.recipesage.com', 'https://recipesage.com', 'https://beta.recipesage.com', 'https://api.recipesage.com', 'https://localhost', 'capacitor://localhost'];
var corsOptions = {
  origin: (origin, callback) => {
    if (corsWhitelist.indexOf(origin) !== -1) {
      callback(null, true); // Enable CORS for whitelisted domains
    } else {
      callback(null, { origin: false }); // Disable CORS, domain not on whitelist
    }
  }
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(cookieParser());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

if (process.env.NODE_ENV !== 'test') app.use(logger('dev'));
app.use(bodyParser.json({
  limit: '250MB',
  verify: (req, res, buf) => {
    var url = req.originalUrl;
    if (url.startsWith('/payments/stripe/webhooks')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(bodyParser.urlencoded({ limit: '250MB', extended: false }));
app.use(cookieParser());
app.disable('x-powered-by');

app.use('/', index);
app.use('/users', users);
app.use('/recipes', recipes);
app.use('/labels', labels);
app.use('/messages', messages);
app.use('/shoppingLists', shoppingLists);
app.use('/mealPlans', mealPlans);
app.use('/print', print);
app.use('/payments', payments);
app.use('/images', images);
app.use('/clip', clip);
app.use('/proxy', proxy);
app.use('/data', data);
app.use('/ws', ws);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

let logError = err => {
  // Do not log expected RESTful errors
  let isExpectedError = err.status < 500 || err > 599;
  if (isExpectedError) return;

  console.error(err);

  Sentry.captureException(err);
};

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;

  if (!err.status) err.status = 500;

  res.locals.error = process.env.NODE_ENV === 'production' ? {} : err;

  logError(err);

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
