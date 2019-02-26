var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var FCMToken = require('../models').FCMToken;
var Session = require('../models').Session;

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
    createdAt: res.locals.user.createdAt,
    updatedAt: res.locals.user.updatedAt
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
      email: UtilService.sanitizeEmail(req.query.email)
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

  SQ.transaction(transaction => {
    return User.login(req.body.email, req.body.password, transaction).then(user => {
      // Update lastLogin
      user.lastLogin = Date.now();

      return Promise.all([
        user.save({ transaction }),
        SessionService.generateSession(user.id, 'user', transaction)
      ]).then(([user, { token }]) => {
        return token;
      });
    });
  }).then(token => {
    res.status(200).json({
      token
    });
  }).catch(next);
});

/* Register as a user */
router.post(
  '/register',
  cors(),
  function(req, res, next) {

  SQ.transaction(transaction => {
    let sanitizedEmail = UtilService.sanitizeEmail(req.body.email);

    if (!UtilService.validateEmail(sanitizedEmail)) {
      let e = new Error('Email is not valid!');
      e.status = 412;
      throw e;
    } else if (!UtilService.validatePassword(req.body.password)) {
      let e = new Error('Password is not valid!');
      e.status = 411;
      throw e;
    } else {
      //Check if a user with that email already exists
      return User.find({
        where: {
          email: sanitizedEmail
        },
        attributes: ['id'],
        transaction
      }).then(user => {
        if (user) {
          let e = new Error("Account with that email address already exists!");
          e.status = 406;
          throw e;
        }

        let hashedPasswordData = User.generateHashedPassword(req.body.password);

        return User.create({
          name: (req.body.name || sanitizedEmail).trim(),
          email: sanitizedEmail,
          passwordHash: hashedPasswordData.hash,
          passwordSalt: hashedPasswordData.salt,
          passwordVersion: hashedPasswordData.version
        }, { transaction }).then(newUser => {
          return SessionService.generateSession(newUser.id, 'user', transaction).then(({ token }) => {
            return token
          });
        });
      });
    }
  })
  .then(token => {
    res.status(200).json({
      token
    });
  })
  .catch(next);
});

/* Forgot password */
router.post(
  '/forgot',
  cors(),
  function(req, res, next) {

  let standardStatus = 200;
  let standardResponse = {
    msg: ""
  }

  var origin = req.get('origin');

  User.find({
    where: {
      email: UtilService.sanitizeEmail(req.body.email)
    }
  }).then(function(user) {
    if (!user) {
      res.status(standardStatus).json(standardResponse);
    } else {
      return SessionService.generateSession(user.id, 'user').then(({ token }) => {
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

        return UtilService.sendmail([user.email], [], 'RecipeSage Password Reset', html, plain).then(() => {
          res.status(standardStatus).json(standardResponse);
        });
      });
    }
  }).catch(next);
});

/* Update user */
router.put(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  return SQ.transaction(t => {
    let updates = {};

    return Promise.all([
      // Password update stage
      Promise.resolve().then(() => {
        if (!req.body.password) return;

        if (!UtilService.validatePassword(req.body.password)) {
          var e = new Error("Password is not valid!");
          e.status = 412;
          throw e;
        }

        let hashedPasswordData = User.generateHashedPassword(req.body.password);

        updates.passwordHash = hashedPasswordData.hash;
        updates.passwordSalt = hashedPasswordData.salt;
        updates.passwordVersion = hashedPasswordData.version;

        return Promise.all([
          FCMToken.destroy({
            where: {
              userId: res.locals.session.userId
            },
            transaction: t
          }),
          Session.destroy({
            where: {
              userId: res.locals.session.userId
            },
            transaction: t
          })
        ])
      }),
      // Email update stage
      Promise.resolve().then(() => {
        if (!req.body.email) return;

        let sanitizedEmail = UtilService.sanitizeEmail(req.body.email);

        if (!UtilService.validateEmail(sanitizedEmail)) {
          var e = new Error("Email is not valid!");
          e.status = 412;
          throw e;
        }

        return User.findOne({
          where: {
            id: { [Op.ne]: res.locals.session.userId },
            email: sanitizedEmail
          },
          attributes: ['id'],
          transaction: t
        }).then(user => {
          if (user) {
            var e = new Error("Account with that email address already exists!");
            e.status = 406;
            throw e;
          }

          updates.email = sanitizedEmail;
        });
      }),
      // Other info update stage
      Promise.resolve().then(() => {
        if (req.body.name && typeof req.body.name === 'string' && req.body.name.length > 0) updates.name = req.body.name;
      })
    ]).then(() => {
      return User.update(updates, {
        where: {
          id: res.locals.session.userId
        },
        returning: true,
        transaction: t
      })
      .then(([numUpdated, [updatedUser]]) => {
        const { id, name, email, createdAt, updatedAt } = updatedUser;

        res.status(200).json({
          id,
          name,
          email,
          createdAt,
          updatedAt
        });
      });
    });
  }).catch(next);
});

/* Delete user */
router.delete(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {

  return SQ.transaction(t => {
    User.destroy({
      where: {
        id: res.locals.session.userId
      },
      transaction: t
    }).then(() => {
      res.status(200).send("Ok");
    })
  })
})

router.post(
  '/logout',
  cors(),
  MiddlewareService.validateSession(['user']),
  function (req, res, next) {
    SessionService.deleteSession(res.locals.session.token).then(() => {
      res.status(200).json({
        msg: 'Session invalidated. User is now logged out.'
      });
    }).catch(next);
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
      userId: { [Op.ne]: res.locals.session.userId }
    }
  })
  .then(function() {
    return FCMToken.findOrCreate({
      where: {
        token: req.body.fcmToken
      },
      defaults: {
        userId: res.locals.session.userId,
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
      userId: res.locals.session.userId
    }
  })
  .catch(next);
});

module.exports = router;
