var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var cors = require('cors');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Session = mongoose.model('Session');
var nodemailer = require('nodemailer');
var config = require('../config/config.json');

var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');

/* Log in user */
router.post(
  '/login',
  cors(),
  function(req, res, next) {

  User.findOne({
    email: req.body.email.toLowerCase()
  })
  .select('password salt')
  .exec(function(err, user) {
    if (err) {
      res.status(500).json({
        msg: "Couldn't search the database for user!"
      });
    } else if (!user) {
      res.status(404).json({
        msg: "Wrong email!"
      });
    } else {
      //Hash the requested password and salt
      var hash = crypto.pbkdf2Sync(req.body.password, user.salt, 10000, 512, 'sha512');
      //Compare to stored hash
      if (hash == user.password) {
        SessionService.generateSession(user._id, 'user', function(token, session) {
          res.status(200).json({
            token: token
          });
        }, function(err) {
          res.status(err.status).json(err);
        });
      } else {
        res.status(401).json({
          msg: "Password is incorrect!"
        });
      }
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
        res.status(500).send('Could not query database for preexisting user');
      } else if (user) {
        res.status(406).json({
          msg: "Account with that email address already exists!"
        });
      } else {
        //Create a random salt
        var salt = crypto.randomBytes(128).toString('base64');
        //Create a unique hash from the provided password and salt
        var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 512, 'sha512');
        //Create a new user with the assembled information
        var newUser = new User({
          name: req.body.name,
          email: req.body.email.toLowerCase(),
          password: hash,
          salt: salt
        }).save(function(err, newUser) {
          if (err) {
            res.status(500).json({
              msg: "Error saving user to DB!"
            });
          } else {
            SessionService.generateSession(newUser._id, 'user', function(token, session) {
              res.status(200).json({
                token: token
              });
            }, function(err) {
              res.status(err.status).json(err);
            });
          }
        });
      }
    });
  }
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
      //Create a random salt
      var salt = crypto.randomBytes(128).toString('base64');
      //Create a unique hash from the provided password and salt
      var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 512, 'sha512');
      updatedUser.password = hash;
      updatedUser.salt = salt;
    }
    
    updatedUser.updated = Date.now();

    var setUser = {
      $set: updatedUser
    }

    User.update({
      _id: accountId
    }, setUser)
    .exec(function(err, user) {
      if (err) {
        res.status(500).json({
          msg: "Could not update user"
        });
      } else {
        user = user.toObject();
        
        delete user.password;
        delete user.salt;
        
        res.status(200).json(user);
      }
    });
  }
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
          console.log(err)
          res.status(500).json({
            msg: "Couldn't search the database for users!"
          });
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
      } else {
        user = user.toObject();
        
        delete user.password;
        delete user.salt;

        res.status(200).json(user);
      }
    });
});

module.exports = router;
