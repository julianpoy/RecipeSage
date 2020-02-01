var express = require('express');
var router = express.Router();

var MiddlewareService = require('../services/middleware');
var GripService = require('../services/grip');

router.use(GripService.expressGrip.preHandlerGripMiddleware);

router.all(
  '/',
  MiddlewareService.validateSession(['user']),
  function (req, res, next) {
    // Reject non-WebSocket requests
    if (!GripService.expressGrip.verifyIsWebSocket(res, next)) {
      return;
    }

    var ws = GripService.expressGrip.getWsContext(res);

    // If this is a new connection, accept it and subscribe it to a channel
    if (ws.isOpening()) {
      ws.accept();
      ws.subscribe('all');
      ws.subscribe(res.locals.session.userId);
    }

    while (ws.canRecv()) {
      var message;

      try {
        message = ws.recv();
      } catch(e) {
        if (e.message != 'Client disconnected unexpectedly.') throw e;
      }

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
