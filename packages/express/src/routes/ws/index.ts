import express from "express";
const router = express.Router();

import { serveGrip, validateSession } from "@recipesage/util/server/general";

router.use(serveGrip);

router.all(
  "/",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function (req: any, res) {
    if (!req.grip.isProxied) {
      return;
    }

    const ws = req.grip.wsContext;
    if (!ws) {
      res.status(400).send("Not a grip WS request");
      return;
    }

    const session = await validateSession(req.query.token);
    if (!session) {
      res.status(401).send("Unauthorized");
      ws.close();
      return;
    }

    // If this is a new connection, accept it and subscribe it to a channel
    if (ws.isOpening()) {
      ws.accept();
      ws.subscribe("all");
      ws.subscribe(session.userId);
    }

    while (ws.canRecv()) {
      let message;

      try {
        message = ws.recv();
      } catch (e) {
        if (
          e instanceof Error &&
          e.message == "Client disconnected unexpectedly."
        ) {
          // Do nothing
        } else throw e;
      }

      // If return value is null then connection is closed
      if (message == null) {
        ws.close();
        break;
      }
    }

    res.end();
  },
);

export { router as wsRouter };
