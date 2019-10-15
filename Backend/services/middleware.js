var SessionService = require('../services/sessions');
var User = require('../models').User;

exports.validateSession = function(types, optional) {
  return function(req, res, next) {
    if (!req.query.token) {
      // Permit no token if optional
      if (optional) return next();

      // Throw unauthorized without pinging DB
      let e = new Error('Session is not valid!');
      e.status = 401;
      return next(e)
    }

    SessionService.validateSession(req.query.token, types).then(session => {
      res.locals.session = session;
      next();
    }).catch(next);
  }
};

// Requires validateSession
exports.validateUser = function(req, res, next) {
  User.findOne({
    where: {
      id: res.locals.session.userId
    },
    attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt', 'lastLogin']
  }).then(user => {
    if (!user) {
      res.status(404).send("Your user was not found");
    } else {
      res.locals.user = user;
      next();
    }
  }).catch(function(err) {
    res.status(500).json(err);
  });
};
