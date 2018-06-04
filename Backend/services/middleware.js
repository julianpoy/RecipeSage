var SessionService = require('../services/sessions');
var mongoose = require("mongoose");
var User = mongoose.model('User');

exports.validateSession = function(types) {
  return function(req, res, next) {
    SessionService.validateSession(req.query.token, types, function(accountId, session) {
      res.locals.accountId = accountId;
      res.locals.session = session;
      next();
    }, function(err){
      res.status(err.status).json(err);
    });
  }
}

// Requires validateSession
exports.validateUser = function(req, res, next) {
  User.findById(res.locals.accountId).exec(function(err, user){
    if (err) {
      res.status(500).json(err);
    } else if (!user) {
      res.status(404).send("Your user was not found");
    } else {
      res.locals.user = user;
      next();
    }
  });
}
