var express = require('express');
var router = express.Router();
var cors = require('cors');
var xmljs = require("xml-js");
var Raven = require('raven');
var request = require('request');

// DB
var Op = require("sequelize").Op;
var SQ = require('../models').sequelize;
var User = require('../models').User;
var Recipe = require('../models').Recipe;
var Label = require('../models').Label;
var ShoppingList = require('../models').ShoppingList;
var ShoppingListItem = require('../models').ShoppingListItem;

// Service
var MiddlewareService = require('../services/middleware');
var SessionService = require('../services/sessions');
var UtilService = require('../services/util');

//Get all of a user's recipes
router.get(
  '/auth',
  cors(),
  function(req, res, next) {

  res.render('alexa-auth-interstitial');
});

router.get(
  '/authHandler',
  cors(),
  function(req, res, next) {

    MiddlewareService.validateSession(['user'])(req, res, err => {
      if (err instanceof Error) {
        // return res.redirect(`/#/login?redirect=${encodeURIComponent(req.originalUrl)}`)
        return res.status(412).send("Unauthorized")
      }

      MiddlewareService.validateUser(req, res, () => {
        // return res.redirect(`/#/login?redirect=${encodeURIComponent(req.originalUrl)}`)
        SessionService.generateSession(res.locals.session.userId, 'user').then(session => {
          return res.status(200).send({
            token: session.token
          })
        })
      })
    })
  }
)

let getAlexaList = (apiEndpoint, apiAccessToken, listId, status) => {
  return new Promise(resolve => {
    request.get({
      url: `${apiEndpoint}/v2/householdlists/${listId}/${status || 'active'}`,
      headers: {
        'Authorization': `Bearer ${apiAccessToken}`
      }
    }, (e, r, body) => {
      if (e) throw e

      let alexaList = JSON.parse(body);

      resolve(alexaList)
    })
  })
}

let getAlexaListItems = (alexaList, alexaListItemIds) => {
  return alexaList.items.filter(alexaListItem => {
    return alexaListItemIds.indexOf(alexaListItem.id) > -1
  })
}

let getShoppingList = (userId, alexaList, t) => {
  return ShoppingList.find({
    where: {
      userId: userId,
      title: alexaList.name
    },
    attributes: ['id'],
    transaction: t
  })
}

let createShoppingList = (userId, alexaList, t) => {
  return ShoppingList.create({
    userId: userId,
    title: alexaList.name
  }, {
    transaction: t
  })
}

let createShoppingListItem = (userId, shoppingListId, alexaListItem, t) => {
  return ShoppingListItem.create({
    title: alexaListItem.value,
    completed: false,
    userId: userId,
    shoppingListId: shoppingListId,
    recipeId: null,
    mealPlanItemId: null
  }, {
    transaction: t
  })
}

let deleteShoppingListItem = (userId, shoppingListId, alexaListItem, t) => {
  return ShoppingListItem.destroy({
    where: {
      userId: userId,
      title: alexaListItem.value,
      shoppingListId: shoppingListId,
    },
    limit: 1,
    transaction: t
  })
}

let handleItemsUpdatedEvent = (req, res) => {
  let {
    context: {
      System: {
        apiEndpoint,
        apiAccessToken,
        user: {
          accessToken
        }
      }
    },
    request: {
      type,
      body: {
        listId,
        listItemIds
      }
    }
  } = req.body

  return getAlexaList(apiEndpoint, apiAccessToken, listId, 'completed').then(alexaList => {
    return SQ.transaction(t => {
      return getShoppingList(res.locals.session.userId, alexaList, t).then(shoppingList => {
        if (!shoppingList) {
          let e = new Error('Shopping list not found')
          e.status = 404
          throw e
        }

        return shoppingList
      }).then(shoppingList => {
        return Promise.all(getAlexaListItems(alexaList, listItemIds).map(alexaListItem => {
          return deleteShoppingListItem(res.locals.session.userId, shoppingList.id, alexaListItem, t)
        }))
      })
    })
  })
}

let handleItemsCreatedEvent = (req, res) => {
  let {
    context: {
      System: {
        apiEndpoint,
        apiAccessToken,
        user: {
          accessToken
        }
      }
    },
    request: {
      type,
      body: {
        listId,
        listItemIds
      }
    }
  } = req.body

  return getAlexaList(apiEndpoint, apiAccessToken, listId, 'active').then(alexaList => {
    return SQ.transaction(t => {
      return getShoppingList(res.locals.session.userId, alexaList, t).then(shoppingList => {
        if (!shoppingList) {
          return createShoppingList(res.locals.session.userId, alexaList, t)
        }

        return shoppingList
      })
      .then(shoppingList => {
        return Promise.all(getAlexaListItems(alexaList, listItemIds).map(alexaListItem => {
          return createShoppingListItem(res.locals.session.userId, shoppingList.id, alexaListItem, t)
        }))
      })
    })
  })
}

router.post(
  '/events',
  cors(),
  function(req, res, next) {
    let {
      context: {
        System: {
          apiEndpoint,
          apiAccessToken,
          user: {
            accessToken
          }
        }
      },
      request: {
        type,
        body: {
          listId,
          listItemIds
        }
      }
    } = req.body

    req.query.token = accessToken;

    console.log("Received Alexa Request Type: ", type)
    console.log(req.body)

    let handlers = {
      'AlexaHouseholdListEvent.ItemsCreated': handleItemsCreatedEvent,
      'AlexaHouseholdListEvent.ItemsUpdated': handleItemsUpdatedEvent
    }
    if (!handlers[type]) {
      return res.status(200).send('no action')
    }

    MiddlewareService.validateSession(['user'])(req, res, err => {
      if (err) next(err);

      handlers[type](req, res).then(() => res.status(200).send("ok"))
    })
  }
)

router.post(
  '/interact',
  cors(),
  function (req, res, next) {
    // console.log("========================")
    // console.log(req)
    console.log("begin interaction ========================")
    console.log(req.body)
    console.log("end interaction ========================")

    res.status(200)
  }
)

module.exports = router;
