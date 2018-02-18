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
router.post('/login', function(req, res, next) {
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
      var hash = crypto.pbkdf2Sync(req.body.password, user.salt, 10000, 512);
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

/* Join as a user */
router.post('/join', function(req, res, next) {
  var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
  if (!emailRegex.test(req.body.email)) {
    res.status(412).json({
      msg: "Email is not valid!"
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
        var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 512);
        //Create a new user with the assembled information
        var newUser = new User({
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
  if (req.body.email && !emailRegex.test(req.body.email)) {
    res.status(412).json({
      msg: "Email is not valid!"
    });
  } else {
    var session = res.locals.session;
    var accountId = session.accountId;

    var updatedUser = {};

    if (req.body.email && typeof req.body.email === 'string') updatedUser.email = req.body.email;
    if (req.body.password && typeof req.body.password === 'string') {
      //Create a random salt
      var salt = crypto.randomBytes(128).toString('base64');
      //Create a unique hash from the provided password and salt
      var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 512);
      updatedUser.password = hash;
      updatedUser.salt = salt;
    }

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

module.exports = router;
