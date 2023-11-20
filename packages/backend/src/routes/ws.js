import * as express from "express";
const router = express.Router();

import * as MiddlewareService from "../services/middleware.js";
import * as GripService from "../services/grip.js";

router.use(GripService.expressGrip.preHandlerGripMiddleware);

router.all(
  "/",
  MiddlewareService.validateSession(["user"]),
  function (req, res, next) {
    // Reject non-WebSocket requests
    if (!GripService.expressGrip.verifyIsWebSocket(res, next)) {
      return;
    }

    const ws = GripService.expressGrip.getWsContext(res);

    // If this is a new connection, accept it and subscribe it to a channel
    if (ws.isOpening()) {
      ws.accept();
      ws.subscribe("all");
      ws.subscribe(res.locals.session.userId);
    }

    while (ws.canRecv()) {
      let message;

      try {
        message = ws.recv();
      } catch (e) {
        if (e.message != "Client disconnected unexpectedly.") throw e;
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
  },
);

// Add the post-handler middleware to the back of the stack
router.use(GripService.expressGrip.postHandlerGripMiddleware);

export default router;
