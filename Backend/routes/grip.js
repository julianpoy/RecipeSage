var express = require('express');
var router = express.Router();
var Nightmare = require('nightmare');
var cors = require('cors');
var aws = require('aws-sdk');
var semver = require('semver');
var Raven = require('raven');
var config = require('../config/config.json');
var bodyParser = require('body-parser');

// DB
var mongoose = require('mongoose');
var Recipe = mongoose.model('Recipe');
var Label = mongoose.model('Label');

var MiddlewareService = require('../services/middleware');
var UtilService = require('../services/util');
var GripService = require('../services/grip');

// GRIP && PUSHPIN
var grip = require('grip');

router.use(GripService.expressGrip.preHandlerGripMiddleware);

router.all(
  '/ws',
  MiddlewareService.validateSession(['user']),
  MiddlewareService.validateUser,
  function (req, res, next) {
    console.log("user is connecting")
    // Reject non-WebSocket requests
    if (!GripService.expressGrip.verifyIsWebSocket(res, next)) {
      return;
    }

    var ws = GripService.expressGrip.getWsContext(res);

    // If this is a new connection, accept it and subscribe it to a channel
    if (ws.isOpening()) {
      console.log(ws, req, req.query);
      ws.accept();
      ws.subscribe('all');
      ws.subscribe(res.locals.accountId);
    }

    while (ws.canRecv()) {
      var message = ws.recv();

      console.log("got message", message)

      // If return value is null then connection is closed
      if (message == null) {
        ws.close();
        break;
      }

      // Echo the message
      ws.send(message);
    }

    // next() must be called for the post-handler middleware to execute
    next();
  });

// Add the post-handler middleware to the back of the stack
router.use(GripService.expressGrip.postHandlerGripMiddleware);

module.exports = router;
