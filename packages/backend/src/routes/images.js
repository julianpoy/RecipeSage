import * as express from "express";
import * as multer from "multer";
const router = express.Router();
import * as Sentry from "@sentry/node";
import * as Joi from "joi";

// DB
import { Image } from "../models/index.js";

// Service
import * as MiddlewareService from "../services/middleware.js";
import { writeImageBuffer, writeImageURL } from "../services/storage/image";
import * as SubscriptionsService from "../services/subscriptions.js";
import { ObjectTypes } from "../services/storage/shared.ts";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import { BadRequest, NotFound } from "../utils/errors.js";
import { joiValidator } from "../middleware/joiValidator.js";

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
      Sentry.captureException(e);
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

router.post(
  "/url",
  joiValidator(
    Joi.object({
      body: Joi.object({
        url: Joi.string().min(1).max(2048),
      }),
    }),
  ),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const encodeInHighRes = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.Capabilities.HighResImages,
    );

    let file;
    try {
      file = await writeImageURL(
        ObjectTypes.RECIPE_IMAGE,
        req.body.url,
        encodeInHighRes,
      );
    } catch (e) {
      e.status = 415;
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

router.post(
  "/b64",
  joiValidator(
    Joi.object({
      body: Joi.object({
        data: Joi.string().min(1),
      }),
    }),
  ),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const encodeInHighRes = await SubscriptionsService.userHasCapability(
      res.locals.session.userId,
      SubscriptionsService.Capabilities.HighResImages,
    );

    const buffer = Buffer.from(req.body.data, "base64");

    let file;
    try {
      file = await writeImageBuffer(
        ObjectTypes.RECIPE_IMAGE,
        buffer,
        encodeInHighRes,
      );
    } catch (e) {
      e.status = 415;
      Sentry.captureException(e);
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

router.get(
  "/link/:imageId",
  wrapRequestWithErrorHandler(async (req, res) => {
    const image = await Image.findByPk(req.params.imageId);

    if (!image) {
      throw NotFound("Image with that id not found");
    }

    return res.redirect(image.location);
  }),
);

if (process.env.STORAGE_TYPE === "filesystem") {
  router.use(
    "/filesystem",
    express.static(process.env.FILESYSTEM_STORAGE_PATH),
  );
}

export default router;
