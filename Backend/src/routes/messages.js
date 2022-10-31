var express = require('express');
var router = express.Router();
var cors = require('cors');

// DB
var Op = require('sequelize').Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var Message = require('../models').Message;
var FCMToken = require('../models').FCMToken;
var Image = require('../models').Image;

// Service
var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');

router.post(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    if (!req.body.recipeId && !req.body.body) {
      let e = new Error('recipeId or body is required');
      e.status = 412;
      throw e;
    }

    SQ.transaction(async transaction => {
      const recipient = await User.findByPk(req.body.to, {
        include: [
          {
            model: FCMToken,
            attributes: ['id', 'token'],
            as: 'fcmTokens'
          }
        ],
        transaction
      });

      if (!recipient) {
        return res.status(404).send('Could not find user under that ID.');
      }

      let sharedRecipeId;
      if (req.body.recipeId) {
        const sharedRecipe = await Recipe.share(req.body.recipeId, req.body.to, transaction);
        sharedRecipeId = sharedRecipe.id;
      }

      const newMessage = await Message.create({
        fromUserId: res.locals.session.userId,
        toUserId: req.body.to,
        body: req.body.body,
        recipeId: sharedRecipeId,
        originalRecipeId: req.body.recipeId || null
      }, {
        transaction
      });

      const fullMessage = await Message.findOne({
        where: {
          id: newMessage.id
        },
        include: [
          {
            model: User,
            as: 'toUser',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'fromUser',
            attributes: ['id', 'name', 'email']
          },
          {
            model: Recipe,
            as: 'recipe',
            attributes: ['id', 'title'],
            include: [{
              model: Image,
              as: 'images',
              attributes: ['location']
            }]
          },
          {
            model: Recipe,
            as: 'originalRecipe',
            attributes: ['id', 'title'],
            include: [{
              model: Image,
              as: 'images',
              attributes: ['location']
            }]
          }
        ],
        transaction
      });

      let m = fullMessage.toJSON();

      if (m.recipe && m.originalRecipe) {
        m.recipe = UtilService.sortRecipeImages(m.recipe);
        m.originalRecipe = UtilService.sortRecipeImages(m.originalRecipe);
      }

      // Alert for recipient
      m.otherUser = m.fromUser;
      UtilService.dispatchMessageNotification(recipient, m);

      // For sender
      m.otherUser = m.toUser;
      return m;
    }).then(message => {
      res.status(201).json(message);
    }).catch(next);
  });

//Get all of a user's threads
router.get(
  '/threads',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    Message.findAll({
      where: {
        [Op.or]: [{
          toUserId: res.locals.session.userId
        }, {
          fromUserId: res.locals.session.userId
        }]
      },
      include: [
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title']
        },
        {
          model: Recipe,
          as: 'originalRecipe',
          attributes: ['id', 'title']
        }
      ],
      order: [
        ['createdAt', 'ASC']
      ]
    })
      .then(function(messages) {
        var conversationsByUser = messages.reduce(function(acc, el) {
          var otherUser;
          if (el.toUser.id === res.locals.session.userId) {
            otherUser = el.fromUser;
          } else {
            otherUser = el.toUser;
          }

          el.otherUser = otherUser;

          if (!acc[otherUser.id]) {
            acc[otherUser.id] = {
              otherUser: otherUser,
              messageCount: 0
            };

            // Do not fill messages for light requests
            if (!req.query.light) acc[otherUser.id].messages = [];
          }

          // Do not fill messages for light requests
          if (!req.query.light) acc[otherUser.id].messages.push(el);
          acc[otherUser.id].messageCount += 1;

          return acc;
        }, {});

        var conversations = [];
        for (var userId in conversationsByUser) {
          let conversation = conversationsByUser[userId];

          if (req.query.limit && conversation.messageCount > req.query.limit) {
            conversation.messages.splice(0, conversation.messages.length - req.query.limit);
          }

          conversations.push(conversation);
        }

        res.status(200).json(conversations);
      }).catch(next);
  });

router.get(
  '/',
  cors(),
  MiddlewareService.validateSession(['user']),
  function(req, res, next) {

    if (!req.query.user) {
      res.status(400).send('User parameter required.');
      return;
    }

    var messageLimit = req.query.messageLimit ? parseInt(req.query.messageLimit, 10) : 100;

    Message.findAll({
      where: {
        [Op.or]: [{
          fromUserId: req.query.user,
          toUserId: res.locals.session.userId
        }, {
          fromUserId: res.locals.session.userId,
          toUserId: req.query.user
        }]
      },
      include: [
        {
          model: User,
          as: 'toUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'fromUser',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Recipe,
          as: 'recipe',
          attributes: ['id', 'title'],
          include: [{
            model: Image,
            as: 'images',
            attributes: ['location']
          }]
        },
        {
          model: Recipe,
          as: 'originalRecipe',
          attributes: ['id', 'title'],
          include: [{
            model: Image,
            as: 'images',
            attributes: ['location']
          }]
        }
      ],
      order: [
        ['createdAt', 'DESC']
      ],
      limit: messageLimit
    })
      .then(function(messages) {
        res.status(200).json(messages.map(function(message) {
          let m = message.toJSON();

          if (m.toUser.id === res.locals.session.userId) {
            m.otherUser = m.fromUser;
          } else {
            m.otherUser = m.toUser;
          }

          return m;
        }).reverse());
      })
      .catch(next);
  });

module.exports = router;
