var express = require('express');
var router = express.Router();
var cors = require('cors');
var Raven = require('raven');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var User_Profile_Image = require('../models').User_Profile_Image;
var FCMToken = require('../models').FCMToken;
var Session = require('../models').Session;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var Image = require('../models').Image;
var Message = require('../models').Message;
var Friendship = require('../models').Friendship;
var ProfileItem = require('../models').ProfileItem;

// Service
var SessionService = require('../services/sessions');
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
var SubscriptionService = require('../services/subscriptions');

// SharedUtils
var SharedUtils = require('../../../SharedUtils/src');

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const user = await User.findByPk(res.locals.session.userId);

      const subscriptions = (await SubscriptionService.subscriptionsForUser(res.locals.session.userId, true)).map(subscription => {
        return {
          expires: subscription.expires,
          capabilities: SubscriptionService.capabilitiesForSubscription(subscription.name)
        };
      });

      // Manually construct fields to avoid sending sensitive info
      res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        handle: user.handle,
        enableProfile: user.enableProfile,
        profileVisibility: user.profileVisibility,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        subscriptions
      });
    } catch(err) {
      next(err);
    }
  }
);

// Params:
// profileImageId
// enableProfile
// profileVisibility
// profileItems: [
//   title
//   type
//   recipeId?
//   labelId?
//   visibility
// ]

router.put(
  '/profile',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const userId = res.locals.session.userId;

      if (req.body.handle !== undefined && !SharedUtils.isHandleValid(req.body.handle)) {
        const badHandleError = new Error("Handle must only contain A-z 0-9 _ .");
        badHandleError.status = 400;
        throw badHandleError;
      }

      await SQ.transaction(async transaction => {
        await User.update({
          ...(req.body.name !== undefined ? { name: req.body.name } : {}),
          ...(req.body.handle !== undefined ? { handle: req.body.handle } : {}),
          ...(req.body.enableProfile !== undefined ? { enableProfile: req.body.enableProfile } : {}),
          ...(req.body.profileVisibility !== undefined ? { profileVisibility: req.body.profileVisibility } : {}),
        }, {
          where: {
            id: userId
          },
          transaction
        });

        if (req.body.profileItems) {
          await ProfileItem.destroy({
            where: {
              userId
            },
            transaction
          });

          const profileItems = req.body.profileItems.map((profileItem, idx) => {
            const { title, type, recipeId, labelId, visibility } = profileItem;

            if (!["public", "friends-only"].includes(visibility)) {
              const invalidVisibilityError = new Error("Invalid visibility type");
              invalidVisibilityError.status = 400;
              throw invalidVisibilityError;
            }

            if (!["all-recipes", "label", "recipe"].includes(type)) {
              const invalidTypeError = new Error("Invalid profile item type");
              invalidTypeError.status = 400;
              throw invalidTypeError;
            }

            return {
              userId: res.locals.session.userId,
              title,
              type,
              recipeId,
              labelId,
              visibility,
              order: idx
            };
          });

          await ProfileItem.bulkCreate(profileItems, {
            transaction
          });
        }

        if (req.body.profileImageIds) {
          const canUploadMultipleImages = await SubscriptionService.userHasCapability(
            res.locals.session.userId,
            SubscriptionService.CAPABILITIES.MULTIPLE_IMAGES
          );

          if (!canUploadMultipleImages && req.body.profileImageIds.length > 1) {
            const images = await Image.findAll({
              where: {
                id: {
                  [Op.in]: req.body.profileImageIds
                }
              },
              transaction
            });
            const imagesById = images.reduce((acc, img) => ({ ...acc, [img.id]: img }), {});

            req.body.profileImageIds = req.body.profileImageIds.filter((imageId, idx) =>
              idx === 0 || // Allow first image always (users can always upload the first image)
              imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
              moment(imagesById[imageId].createdAt).add(1, 'day').isBefore(moment()) // Allow old images (user's subscription expired)
            );
          }

          if (req.body.profileImageIds.length > 10) req.body.profileImageIds.splice(10); // Limit to 10 images per recipe max

          await User_Profile_Image.destroy({
            where: {
              userId: res.locals.session.userId
            },
            transaction
          });

          await User_Profile_Image.bulkCreate(req.body.profileImageIds.map((imageId, idx) => ({
            userId: res.locals.session.userId,
            imageId: imageId,
            order: idx
          })), {
            transaction
          });
        }
      });

      res.status(200).send("Updated");
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/profile',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      let user = await User.findByPk(res.locals.session.userId, {
        include: [{
          model: Image,
          as: 'profileImages',
          attributes: ['id', 'location']
        }]
      });

      user = UtilService.sortUserProfileImages(user);

      const profileItems = await ProfileItem.findAll({
        where: {
          userId: res.locals.session.userId
        },
        include: [{
          model: Recipe,
          as: 'recipe'
        }, {
          model: Label,
          as: 'label'
        }]
      });

      // Note: Should be the same as /profile/:userId
      res.status(200).json({
        hasPendingFriendInvite: false,
        userIsFriend: true,
        name: user.name,
        handle: user.handle,
        enableProfile: user.enableProfile,
        profileImages: user.profileImages,
        profileItems
      });
    } catch (err) {
      next(err);
    }
  }
)

const getUserProfile = async (req, res, next) => {
  try {
    let profileUserId;
    if (req.params.handle) {
      const user = await User.findOne({
        where: {
          handle: req.params.handle,
        }
      });
      if (!user) {
        const profileUserNotFoundError = new Error("User with that handle not found");
        profileUserNotFoundError.status = 404;
        throw profileUserNotFoundError;
      }
      profileUserId = user.id;
    } else {
      profileUserId = req.params.userId;
    }

    const profileUser = await User.findByPk(profileUserId, {
      include: [{
        model: Image,
        as: 'profileImages',
        attributes: ['id', 'location']
      }]
    });

    if (!profileUser) {
      const profileUserNotFoundError = new Error("User with that id not found");
      profileUserNotFoundError.status = 404;
      throw profileUserNotFoundError;
    }

    if (!profileUser.enableProfile) {
      const profileNotEnabledError = new Error("User does not have an active profile");
      profileNotEnabledError.status = 403;
      throw profileNotEnabledError;
    }

    let userIsFriend = false;
    let hasPendingFriendInvite = false;
    if (res.locals.session.userId) {
      const friendship = await Friendship.findOne({
        where: {
          userId: profileUserId,
          friendId: res.locals.session.userId
        }
      });
      userIsFriend = !!friendship;

      const pendingFriendship = await Friendship.findOne({
        where: {
          userId: res.locals.session.userId,
          friendId: profileUserId
        }
      });

      hasPendingFriendInvite = !!pendingFriendship;
    }

    const profileItems = await ProfileItem.findAll({
      where: {
        userId: profileUserId,
        ...(userIsFriend ? {} : { visibility: "public" })
      },
      include: [{
        model: Recipe,
        as: 'recipe'
      }, {
        model: Label,
        as: 'label'
      }]
    });

    // Note: Should be the same as /profile
    res.status(200).json({
      hasPendingFriendInvite,
      userIsFriend,
      name: profileUser.name,
      handle: profileUser.handle,
      enableProfile: profileUser.enableProfile,
      profileImages: profileUser.profileImages,
      profileItems
    });
  } catch(err) {
    next(err);
  }
}

router.get(
  '/profile/by-handle/:handle',
  MiddlewareService.validateSession(['user'], true),
  getUserProfile
);

router.get(
  '/profile/:userId',
  MiddlewareService.validateSession(['user'], true),
  getUserProfile
);

router.get('/friends',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const myUserId = res.locals.session.userId;

      const outgoingFriendships = await Friendship.findAll({
        where: {
          userId: myUserId
        },
        include: [{
          model: User,
          as: 'friend',
          attributes: ['id', 'name', 'email']
        }]
      });

      const outgoingFriendshipsByOtherUserId = outgoingFriendships.reduce((acc, outgoingFriendship) => (
        { ...acc, [outgoingFriendship.friendId]: outgoingFriendship }
      ), {});

      const incomingFriendships = await Friendship.findAll({
        where: {
          friendId: res.locals.session.userId
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }]
      });

      const incomingFriendshipsByOtherUserId = incomingFriendships.reduce((acc, incomingFriendship) => (
        { ...acc, [incomingFriendship.userId]: incomingFriendship }
      ), {});

      const friendshipSummary = [...outgoingFriendships, ...incomingFriendships].reduce((acc, friendship) => {
        const friendId = friendship.userId === myUserId ? friendship.friendId : friendship.userId;

        if (outgoingFriendshipsByOtherUserId[friendId] && incomingFriendshipsByOtherUserId[friendId]) {
          // Friendship both ways. They are friends!
          if (!acc.friends.find(friendship => friendship.friendId === friendId)) { // Remove dupes
            acc.friends.push({
              friendId,
              otherUser: outgoingFriendshipsByOtherUserId[friendId].friend
            });
          }
        } else if (outgoingFriendshipsByOtherUserId[friendId]) {
          // We're requesting them as a friend!
          acc.outgoingRequests.push({
            friendId,
            otherUser: outgoingFriendshipsByOtherUserId[friendId].friend
          });
        } else if (incomingFriendshipsByOtherUserId[friendId]) {
          // They're requesting us as a friend!
          acc.incomingRequests.push({
            friendId,
            otherUser: incomingFriendshipsByOtherUserId[friendId].user
          });
        }

        return acc;
      }, {
        outgoingRequests: [],
        incomingRequests: [],
        friends: []
      });

      res.status(200).json(friendshipSummary);
    } catch(err) {
      next(err);
    }
  }
);

router.post('/friends/:userId',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const profileUserId = req.params.userId;

      await SQ.transaction(async transaction => {
        await Friendship.destroy({
          where: {
            userId: res.locals.session.userId,
            friendId: profileUserId
          },
          transaction
        });

        await Friendship.create({
          userId: res.locals.session.userId,
          friendId: profileUserId
        }, {
          transaction
        });
      });

      res.status(201).send("Created");
    } catch(err) {
      next(err);
    }
  }
);

router.get(
  '/handle-info/:handle',
  MiddlewareService.validateSession(['user']),
  async (req, res, next) => {
    try {
      const user = await User.findOne({
        where: {
          handle: req.params.handle,
        },
        attributes: ['id'],
      });

      res.status(200).json({
        available: !user,
      });
    } catch(err) {
      next(err);
    }
  }
);

router.get(
  '/capabilities',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  async (req, res, next) => {
    try {
      const userCapabilities = await SubscriptionService.capabilitiesForUser(res.locals.session.userId);

      const capabilityTypes = Object.values(SubscriptionService.CAPABILITIES);

      const capabilityMap = capabilityTypes.reduce((acc, capabilityType) => {
        acc[capabilityType] = userCapabilities.indexOf(capabilityType) > -1;
        return acc;
      }, {});

      res.status(200).json(capabilityMap);
    } catch(err) {
      next(err);
    }
  }
);

router.get(
  '/stats',
  cors(),
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function(req, res, next) {
  const userId = res.locals.session.userId;

  Promise.all([
    Recipe.count({
      where: {
        userId
      }
    }),
    Recipe.count({
      where: {
        userId
      },
      include: [{
        model: Image,
        as: "images",
        required: true
      }]
    }),
    Message.count({
      where: {
        [Op.or]: [{
          toUserId: userId
        }, {
          fromUserId: userId
        }]
      }
    })
  ]).then(results => {
    const [recipeCount, recipeImageCount, messageCount] = results;

    res.status(200).json({
      recipeCount,
      recipeImageCount,
      messageCount,
      createdAt: res.locals.user.createdAt,
      lastLogin: res.locals.user.lastLogin
    });
  }).catch(next);
});

/* Get public user listing by email */
router.get(
  '/by-email',
  cors(),
  function(req, res, next) {

  User.findOne({
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

  let sanitizedEmail = UtilService.sanitizeEmail(req.body.email);

  SQ.transaction(transaction => {
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
      return User.findOne({
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

    var html = `Welcome to RecipeSage!<br />

    <br /><br />Thanks for joining our community of recipe collectors!
    <br /><br />

    Please feel free to contact me if you have questions, concerns or comments at <a href="mailto:julian@recipesage.com?subject=RecipeSage%20Support">julian@recipesage.com</a>.

    <br />

    <br /><br />Best,
    <br />Julian Poyourow
    <br />Developer of RecipeSage - <a href="https://recipesage.com">https://recipesage.com</a>
    <br /><br />
    <b>Social:</b><br />
    Discord: <a href="https://discord.gg/yCfzBft">https://discord.gg/yCfzBft</a><br />
    Facebook: <a href="https://www.facebook.com/recipesageofficial/">https://www.facebook.com/recipesageofficial/</a><br />
    Instagram: <a href="https://www.instagram.com/recipesageofficial/">https://www.instagram.com/recipesageofficial/</a><br />
    Twitter: <a href="https://twitter.com/RecipeSageO">https://twitter.com/RecipeSageO</a>`;

    var plain = `Welcome to RecipeSage!


Thanks for joining our community of recipe collectors!

Please feel free to contact me if you have questions, concerns or comments at julian@recipesage.com.


Best,
Julian Poyourow
Developer of RecipeSage - https://recipesage.com

Social:
https://discord.gg/yCfzBft
https://www.facebook.com/recipesageofficial/
https://www.instagram.com/recipesageofficial/
https://twitter.com/RecipeSageO`;

    UtilService.sendmail([sanitizedEmail], [], 'Welcome to RecipeSage!', html, plain).catch(err => {
      Raven.captureException(err);
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

  let origin;
  if (process.env.NODE_ENV === 'production') {
    origin = 'https://recipesage.com';
  } else {
    // req.get('origin') can be unreliable depending on client browsers. Use only for dev/stg.
    origin = req.get('origin');
  }

  User.findOne({
    where: {
      email: UtilService.sanitizeEmail(req.body.email)
    }
  }).then(function(user) {
    if (!user) {
      res.status(standardStatus).json(standardResponse);
    } else {
      return SessionService.generateSession(user.id, 'user').then(({ token }) => {
        var link = origin + '/#/settings/account?token=' + token;
        var html = `Hello,

        <br /><br />Someone recently requested a password reset link for the RecipeSage account associated with this email address.
        <br /><br />If you did not request a password reset, please disregard this email.

        <br /><br /><a href="` + link + `">Click here to reset your password</a>
        <br />or paste this url into your browser: ` + link + `

        <br />

        <br /><br />Thank you,
        <br />Julian P.
        <br />RecipeSage`;

        var plain = `Hello,

Someone recently requested a password reset link for the RecipeSage account associated with this email address.
If you did not request a password reset, please disregard this email.

To reset your password, paste this url into your browser: ` + link + `

Thank you,
Julian P.
RecipeSage`;

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
  }).then(() => {
    res.status(200).send("ok");
  }).catch(next);
});

module.exports = router;
