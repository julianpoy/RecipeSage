var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var Sequelize = require('sequelize');
var User = require('../models').User;
var FCMToken = require('../models').FCMToken;

// Service
var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  // Manually construct fields to avoid sending sensitive info
  var user = {
    id: res.locals.user.id,
    name: res.locals.user.name,
    email: res.locals.user.email,
    created: res.locals.user.created,
    updated: res.locals.user.updated
  };

  res.status(200).json(user);

});

/* Get public user listing by email */
router.get(
  '/by-email',
  cors(),
  function(req, res, next) {

  User.find({
    where: {
      email: req.query.email.trim().toLowerCase()
    },
    attributes: ['id', 'name', 'email']
  })
  .then(function(user) {
    if (!user) {
      res.status(404).json({
        msg: "No user with that email!"
      });
    } else {
      res.status(200).json(user);
    }
  })
  .catch(next);
});

/* Log in user */
router.post(
  '/login',
  cors(),
  function(req, res, next) {

  User.findOne({
    where: {
      email: req.body.email.toLowerCase()
    }
  }).then(function(user) {
    if (!user) {
      res.status(404).json({
        msg: "Wrong email!"
      });
    } else {
      user.validatePassword(req.body.password, function(err, isValid) {
        if (err) {
          var payload = {
            msg: "Couldn't validate the database user password!"
          };
          res.status(500).json(payload);
          payload.err = err;
          Raven.captureException(payload);
        } else if (!isValid) {
          res.status(401).json({
            msg: "Password is incorrect!"
          });
        } else {
          SessionService.generateSession(user.id, 'user', function(token, session) {
            res.status(200).json({
              token: token
            });
          }, function(err) {
            res.status(err.status).json(err);
          });

          // Update lastLogin
          user.lastLogin = Date.now();

          user.save().catch(function(err) {
            if (err) {
              Raven.captureException("Could not update user after login");
            }
          });
        }
      });
    }
  }).catch(function(err) {
    console.log("got here", err)
    var payload = {
      msg: "Couldn't search the database for user!"
    };
    res.status(500).json(payload);
    payload.err = err;
    Raven.captureException(payload);
  });
});

/* Register as a user */
router.post(
  '/register',
  cors(),
  function(req, res, next) {

  var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
  if (!emailRegex.test(req.body.email) || req.body.email.length === 0) {
    res.status(412).json({
      msg: "Email is not valid!"
    });
  } else if (req.body.password.length < 6) {
    res.status(411).json({
      msg: "Password is too short!"
    });
  } else {
    //Check if a user with that email already exists
    User.find({
      where: {
        email: req.body.email.toLowerCase()
      },
      attributes: ['id']
    }).then(function(user) {
      if (user) {
        res.status(406).json({
          msg: "Account with that email address already exists!"
        });
      } else {
        User.generateHashedPassword(req.body.password, function(hashedPasswordData) {
          User.create({
            name: req.body.name,
            email: req.body.email.toLowerCase(),
            passwordHash: hashedPasswordData.hash,
            passwordSalt: hashedPasswordData.salt,
            passwordVersion: hashedPasswordData.version
          }).then(function(newUser) {
            SessionService.generateSession(newUser.id, 'user', function(token, session) {
              res.status(200).json({
                token: token
              });
            }, function(err) {
              res.status(err.status).json(err);
              Raven.captureException(err);
            });
          }).catch(next);
        });
      }
    }).catch(next);
  }
});

/* Forgot password */
router.post(
  '/forgot',
  cors(),
  function(req, res, next) {

    var origin = req.get('origin');
console.log(origin)

  User.find({
    where: {
      email: req.body.email.toLowerCase()
    }
  }).then(function(user) {
    if (!user) {
      res.status(200).json({
        msg: ""
      });
    } else {
      SessionService.generateSession(user.id, 'user', function (token, session) {
        var link = origin + '/#/account?token=' + token;
        var html = `Hello,

        <br /><br />Someone recently requested a password reset link for the RecipeSage account associated with this email address.
        <br /><br />If you did not request a password reset, please disregard this email.

        <br /><br /><a href="` + link + `">Click here to reset your password</a>
        <br />or paste this url into your browser: ` + link + `

        <br /><br />Thank you,
        <br />Julian P.
        <br />RecipeSage
        <br /><br />
        Please do not reply to this email.`;

        var plain = `Hello,

        \n\nSomeone recently requested a password reset link for the RecipeSage account associated with this email address.
        \n\nIf you did not request a password reset, please disregard this email.

        \n\nTo reset your password, paste this url into your browser: ` + link + `

        \n\nThank you,
        \nJulian P.
        \nRecipeSage
        \n\n
        Please do not reply to this email.`;

        UtilService.sendmail([user.email], [], 'RecipeSage Password Reset', html, plain, function() {
          res.status(200).json({
            msg: ""
          });
        }, next);
      }, next);
    }
  });
});

/* Update user */
router.put(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
  if (req.body.email && (!emailRegex.test(req.body.email) || req.body.email.length < 1)) {
    res.status(412).json({
      msg: "Email is not valid!"
    });
  } else {
    var updates = {};

    if (req.body.name && typeof req.body.name === 'string') updates.name = req.body.name;
    if (req.body.email && typeof req.body.email === 'string') updates.email = req.body.email;

    new Promise(function(resolve, reject) {
      if (req.body.password && typeof req.body.password === 'string') {
        User.generateHashedPassword(req.body.password, function(hashedPasswordData) {
          updates.passwordHash = hashedPasswordData.hash;
          updates.passwordSalt = hashedPasswordData.salt;
          updates.passwordVersion = hashedPasswordData.version;
          resolve();
        });
      } else {
        resolve();
      }
    }).then(function() {
      return User.update(updates, {
        where: {
          id: res.locals.userId
        },
        returning: true
      })
      .then(function() {
        return User.find({
          where: {
            id: res.locals.userId
          },
          attributes: ['id', 'name', 'email', 'createdAt', 'updatedAt']
        }).then(function(updatedUser) {
          res.status(200).json(updatedUser);
        });
      });
    }).catch(next);
  }
});

router.post(
  '/logout',
  cors(),
  MiddlewareService.validateSession(['user']),
  function (req, res) {
    SessionService.deleteSession(res.locals.session.token, function() {
      res.status(200).json({
        msg: 'Session invalidated. User is now logged out.'
      });
    }, function(err) {
      res.status(err.status).send(err);
      Raven.captureException(err);
    });
  });

/* Check if a session token is valid */
router.get(
  '/sessioncheck',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {
  res.status(200).send('Ok');
});

router.post(
  '/fcm/token',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

  if (!req.body.fcmToken) {
    res.status(412).send('fcmToken required');
    return;
  }

  FCMToken.destroy({
    where: {
      token: req.body.fcmToken,
      userId: { [Sequelize.Op.ne]: res.locals.userId }
    }
  })
  .then(function() {
    return FCMToken.findOrCreate({
      where: {
        token: req.body.fcmToken
      },
      defaults: {
        userId: res.locals.userId,
        token: req.body.fcmToken
      }
    })
    .then(function(token) {
      res.status(200).send(token);
    });
  })
  .catch(next);
});

router.delete(
  '/fcm/token',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    if (!req.query.fcmToken) {
      res.status(412).send('fcmToken required');
      return;
    }

    FCMToken.destroy({
      where: {
        token: req.query.fcmToken,
        userId: res.locals.userId
      }
    });
});

module.exports = router;
