var express = require('express');
var router = express.Router();
var cors = require('cors');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var nodemailer = require('nodemailer');
var Raven = require('raven');

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
    _id: res.locals.user._id,
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

  User.findOne({
    email: req.query.email.trim().toLowerCase()
  })
  .select('_id name email')
  .exec(function(err, user) {
    if (err) {
      var payload = {
        msg: "Couldn't search the database for user!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else if (!user) {
      res.status(404).json({
        msg: "No user with that email!"
      });
    } else {
      res.status(200).json(user);
    }
  });
});

/* Log in user */
router.post(
  '/login',
  cors(),
  function(req, res, next) {

  User.findOne({
    email: req.body.email.toLowerCase()
  })
  .exec(function(err, user) {
    if (err) {
      var payload = {
        msg: "Couldn't search the database for user!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else if (!user) {
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
          SessionService.generateSession(user._id, 'user', function(token, session) {
            res.status(200).json({
              token: token
            });
          }, function(err) {
            res.status(err.status).json(err);
          });

          // Update lastLogin
          user.lastLogin = Date.now();

          user.save(function(err) {
            if (err) {
              Raven.captureException("Could not update user after login");
            }
          });
        }
      });
    }
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
    User.findOne({
      email: req.body.email.toLowerCase()
    })
    .select('_id')
    .exec(function(err, user) {
      if (err) {
        var payload = {
          msg: 'Could not query database for preexisting user'
        };
        res.status(500).json(payload);
        payload.err = err;
        Raven.captureException(payload);
      } else if (user) {
        res.status(406).json({
          msg: "Account with that email address already exists!"
        });
      } else {
        User.generateHashedPassword(req.body.password, function(hashedPasswordData) {
          var newUser = new User({
            name: req.body.name,
            email: req.body.email.toLowerCase(),
            password: hashedPasswordData.hash,
            salt: hashedPasswordData.salt,
            passwordVersion: hashedPasswordData.version
          }).save(function(err, newUser) {
            if (err) {
              var payload = {
                msg: "Error saving user to DB!"
              };
              res.status(500).json(payload);
              payload.err = err;
              Raven.captureException(payload);
            } else {
              SessionService.generateSession(newUser._id, 'user', function(token, session) {
                res.status(200).json({
                  token: token
                });
              }, function(err) {
                res.status(err.status).json(err);
                Raven.captureException(err);
              });
            }
          });
        });
      }
    });
  }
});

/* Forgot password */
router.post(
  '/forgot',
  cors(),
  function(req, res, next) {

    var origin = req.get('origin');
console.log(origin)

  User.findOne({
    email: req.body.email.toLowerCase()
  }).exec(function(err, user) {
    if (err) {
      var payload = {
        msg: "Couldn't search the database for user!"
      };
      res.status(500).json(payload);
      payload.err = err;
      Raven.captureException(payload);
    } else if (!user) {
      res.status(200).json({
        msg: ""
      });
    } else {
      SessionService.generateSession(user._id, 'user', function (token, session) {
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
        }, function(err) {
          res.status(500).json({
            msg: "An error occured."
          });
          Raven.captureException(err);
        });
      }, function (err) {
        res.status(500).json({
          msg: "An error occured."
        });
        Raven.captureException(err);
      });
    }
  });
});

/* Update user */
router.put(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

  var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
  if (req.body.email && (!emailRegex.test(req.body.email) || req.body.email.length < 1)) {
    res.status(412).json({
      msg: "Email is not valid!"
    });
  } else {
    var session = res.locals.session;
    var accountId = session.accountId;

    var updatedUser = {};

    if (req.body.name && typeof req.body.name === 'string') updatedUser.name = req.body.name;
    if (req.body.email && typeof req.body.email === 'string') updatedUser.email = req.body.email;
    if (req.body.password && typeof req.body.password === 'string') {
      User.generateHashedPassword(req.body.password, function(hashedPasswordData) {
        updatedUser.password = hashedPasswordData.hash;
        updatedUser.salt = hashedPasswordData.salt;
        updatedUser.passwordVersion = hashedPasswordData.version;
        save();
      });
    } else {
      save();
    }

    updatedUser.updated = Date.now();

    function save() {
      var setUser = {
        $set: updatedUser
      }

      User.update({
        _id: accountId
      }, setUser, {
        new: true
      })
      .lean()
      .exec(function(err, user) {
        if (err) {
          var payload = {
            msg: "Could not update user"
          };
          res.status(500).json(payload);
          payload.err = err;
          Raven.captureException(payload);
        } else {
          delete user.password;
          delete user.salt;

          res.status(200).json(user);
        }
      });
    }
  }
});

router.post(
  '/logout',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
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

/* User forgot password */
// router.post('/forgot', function(req, res, next) {
//   //Find a user with the email requested. Select salt and password
//   var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
//   if (!emailRegex.test(req.body.email)) {
//     res.status(412).json({
//       msg: "Email is not valid!"
//     });
//   } else {
//     //Check if a user with that email already exists
//     User.findOne({
//       email: req.body.email.toLowerCase()
//     })
//     .select('_id')
//     .exec(function(err, user) {
//       if (err) {
//         res.status(500).send('Could not query database for user with that email');
//       } else if (user) {
//         //Create a random token
//         var token = crypto.randomBytes(48).toString('hex');
//         //New session!
//         new Session({
//           user_id: user._id,
//           token: token
//         }).save(function(err) {
//           if (err) {
//             res.status(500).json({
//               msg: "Error saving token to DB!"
//             });
//           } else {
//             var messagePlain = 'Hello ' + req.body.email.toLowerCase() + ', You recently requested a password reset for your LinkJay account. If you didn\'t, please ignore this email. Here is your reset link: https://LinkJay.com/#/forgot/' + token;
//             var messageHTML = 'Hello LinkJay User!<br><br> You recently requested a password reset for your LinkJay account. If you didn\'t, please ignore this email. <br><br>Here is your reset link: <br>https://LinkJay.com/#/forgot/' + token;

//             var transporter = nodemailer.createTransport({
//               service: 'Gmail',
//               auth: {
//                 user: config.gmail.username,
//                 pass: config.gmail.password
//               }
//             });
//             var mailOptions = {
//               from: config.gmail.alias,
//               to: req.body.email.toLowerCase(),
//               subject: 'LinkJay Password Reset Link',
//               text: messagePlain,
//               html: messageHTML
//             }
//             console.log(mailOptions);
//             transporter.sendMail(mailOptions, function(error, response) {
//               if (error) {
//                 console.log(error);
//               } else {
//                 console.log("Message sent: " + response.message);
//               }
//             });

//             res.status(200).json({
//               msg: "Password reset email was sent!"
//             });
//           }
//         });
//       } else {
//         res.status(404).json({
//           msg: "Email does not exist!"
//         });
//       }
//     });
//   }
// });

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
  MiddlewareService.validateUser,
  function(req, res, next) {

    if (!req.body.fcmToken) {
      res.status(412).send('fcmToken required');
      return;
    }

    var revokeTokenPromise = new Promise(function(resolveRevokeToken, rejectRevokeToken) {
      User.find({
        fcmTokens: req.body.fcmToken,
        _id: { $ne: res.locals.session.accountId }
      }).exec(function(err, users) {
        if (err) {
          var payload = {
            msg: "Couldn't search the database for users!"
          };
          res.status(500).json(payload);
          payload.err = err;
          Raven.captureException(payload);
        } else if (!users) {
          resolveRevokeToken();
        } else {
          var userPromises = [];

          for (var i = 0; i < users.length; i++) {
            let user = users[i];

            userPromises.push(new Promise(function(resolve, reject) {
              User.findByIdAndUpdate(
                user._id, {
                  $pull: {
                    fcmTokens: req.body.fcmToken
                  }
                }, {
                new: true
              }).exec(function(err, updatedUser) {
                if (err) {
                  reject(500, "Couldn't search the database for users during fcm revoke!");
                  Raven.captureException(err);
                } else {
                  resolve();
                }
              });
            }));
          }

          Promise.all(userPromises).then(function() {
            resolveRevokeToken();
          }, function() {
            rejectRevokeToken();
          });
        }
      });
    });

    revokeTokenPromise.then(function() {
      if (res.locals.user.fcmTokens && res.locals.user.fcmTokens.indexOf(req.body.fcmToken) > -1) {
        var user = res.locals.user.toObject();

        delete user.password;
        delete user.salt;

        res.status(200).json(user);
        return;
      }

      User.findOneAndUpdate({
        _id: res.locals.session.accountId
      }, {
        $addToSet: {
          "fcmTokens": req.body.fcmToken
        }
      }, {
        safe: true,
        upsert: false, // Create if not exists
        new: true // Return updated, not original
      }, function(err, user) {
        if (err) {
          res.status(500).json({
            msg: "Couldn't add to the database!"
          });
          Raven.captureException(err);
        } else {
          user = user.toObject();

          delete user.password;
          delete user.salt;

          res.status(201).json(user);
        }
      });
    });
});

router.delete(
  '/fcm/token',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {

    if (!req.query.fcmToken) {
      res.status(412).send('fcmToken required');
      return;
    } else if (!res.locals.user.fcmTokens || res.locals.user.fcmTokens.indexOf(req.query.fcmToken) === -1) {
      res.status(404).send('fcmToken not found');
      return;
    }

    User.findOneAndUpdate({
      _id: res.locals.session.accountId
    }, {
      $pull: {
        'fcmTokens': req.query.fcmToken
      }
    }, {
      safe: true,
      upsert: false, // Create if not exists
      new: true // Return updated, not original
    }, function(err, user) {
      if (err) {
        res.status(500).json({
          msg: "Couldn't query the database!"
        });
        Raven.captureException(err);
      } else {
        user = user.toObject();

        delete user.password;
        delete user.salt;

        res.status(200).json(user);
      }
    });
});

module.exports = router;
