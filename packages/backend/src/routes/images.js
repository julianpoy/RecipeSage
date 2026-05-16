import express from "express";
import multer from "multer";
const router = express.Router();
import * as Sentry from "@sentry/node";

// DB
import { Image } from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import { writeImageBuffer, ObjectTypes } from "@recipesage/util/server/storage";
import { FileTransformError } from "@recipesage/util/server/general";
import * as SubscriptionsService from "../services/subscriptions.js";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { BadRequest } from "../utils/errors.js";

router.post(
  "/",
  MiddlewareService.validateSession(["user"]),
  multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB
    },
  }).single("image"),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.file) {
      throw BadRequest('Must specify multipart field "image"');
    }

    const encodeInHighRes = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.Capabilities.HighResImages,
    );

    let file;
    try {
      file = await writeImageBuffer(
        ObjectTypes.RECIPE_IMAGE,
        req.file.buffer,
        encodeInHighRes,
      );
    } catch (e) {
      e.status = 415;
      if (!(e instanceof FileTransformError)) {
        Sentry.captureException(e);
      }
      throw e;
    }

    const image = await Image.create({
      userId: res.locals.session.userId,
      location: file.location,
      key: file.key,
      json: file,
    });

    res.status(200).send(image);
  }),
);

if (process.env.STORAGE_TYPE === "filesystem") {
  router.use(
    "/filesystem",
    express.static(process.env.FILESYSTEM_STORAGE_PATH),
  );
}

export default router;
