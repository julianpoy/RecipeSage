var crypto = require('crypto'),
  moment = require('moment'),
  Raven = require('raven');

var Sequelize = require('sequelize');
var Session = require('../models').Session;
var Op = Sequelize.Op;

var SESSION_VALIDITY_LENGTH = 7; // Initial session validity time
var SET_GRACE_WHEN = 5; // Set token expiry equal to grace period if session will expire in X days
var SESSION_GRACE_PERIOD = 7; // Should always be more than SET_GRACE_WHEN

//Checks if a token exists, and returns the corrosponding userId
exports.validateSession = function(token, type, success, fail) {
  var query;
  if(typeof type == "string"){
    query = {
      type: type
    }
  } else {
    query = {
      type: { [Op.in]: type }
    }
  }
  query.token = token;
  query.expires = {[Op.gte]: Date.now() };

  Session.findOne({
    where: query,
    attributes: ['id', 'userId', 'token', 'type', 'expires']
  })
  .then(function(session) {
    if (!session) {
      fail({
        msg: "Session is not valid!",
        status: 401
      });
    } else {
      success(session.userId, session);

      // Extend the session expiry if necessary
      if (moment(session.expires).subtract(SET_GRACE_WHEN, "days").isBefore(moment())) {
        var updateCmd = {
          // updatedAt: Date.now(),
          expires: moment().add(SESSION_GRACE_PERIOD, "days")
        }

        session.update(updateCmd).catch(function(err){
          var payload = {
            msg: "Error reading database when extending user token!",
            err: err
          }
          Raven.captureException(payload);
        });
      }
    }
  })
  .catch(function(err) {
    var payload = {
      msg: "Could not search database for session!",
      status: 500
    };
    fail(payload);
    payload.err = err;
    Raven.captureException(payload);
  });

  //Clean out all old items
  var removeOld = {
    expires: {[Op.lt]: Date.now()}
  }
  Session.destroy({
    where: removeOld
  }).catch(function(err) {
    if (err) {
      var payload = {
        msg: "Error removing old sessions!",
        err: err
      }
      Raven.captureException(payload);
    }
  });
};

//Creates a token and returns the token if successful
exports.generateSession = function(userId, type, success, fail) {
  //Create a random token
  var token = crypto.randomBytes(48).toString('hex');
  //New session!
  Session.create({
    userId,
    type,
    token,
    expires: moment().add(SESSION_VALIDITY_LENGTH, "days")
  }).then(function(session) {
    success(token, session);
  }).catch(function(err) {
    var payload = {
      msg: "Could not add session to DB!",
      status: 500
    }
    fail(payload);
    payload.err = err;
    Raven.captureException(payload);
  });
};

//Creates a token and returns the token if successful
exports.deleteSession = function(token, success, fail) {
  Session.destroy({
    where: {
      token: token
    }
  }).then(function(){
    success();
  }).catch(function(err) {
    var payload = {
      msg: "Could not delete session!",
      status: 500
    }
    fail(payload);
    payload.err = err;
    Raven.captureException(payload);
  });
};
