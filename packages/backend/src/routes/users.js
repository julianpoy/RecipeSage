import * as express from "express";
const router = express.Router();
import * as cors from "cors";
import * as Sentry from "@sentry/node";
import * as moment from "moment";

// DB
import { Op } from "sequelize";
import {
  sequelize,
  User,
  User_Profile_Image,
  FCMToken,
  Session,
  Recipe,
  Label,
  Image,
  Message,
  Friendship,
  ProfileItem,
} from "../models";

// Service
import * as SessionService from "../services/sessions.js";
import * as MiddlewareService from "../services/middleware.js";
import * as UtilService from "../services/util.js";
import * as SubscriptionService from "../services/subscriptions.js";
import { sendWelcome } from "../services/email/welcome.ts";
import { sendPasswordReset } from "../services/email/passwordReset.ts";
import { getFriendships } from "../utils/getFriendships.js";

import * as SharedUtils from "@recipesage/util";

// Util
import { wrapRequestWithErrorHandler } from "../utils/wrapRequestWithErrorHandler.js";
import {
  BadRequest,
  Forbidden,
  NotFound,
  PreconditionFailed,
} from "../utils/errors.js";
import { deleteHangingImagesForUser } from "../utils/data/deleteHangingImages.js";
import { indexRecipes } from "@recipesage/trpc";

router.get(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const user = await User.findByPk(res.locals.session.userId);

    const subscriptions = (
      await SubscriptionService.subscriptionsForUser(
        res.locals.session.userId,
        true,
      )
    ).map((subscription) => {
      return {
        expires: subscription.expires,
        capabilities: SubscriptionService.capabilitiesForSubscription(
          subscription.name,
        ),
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
      subscriptions,
    });
  }),
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
  "/profile",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const userId = res.locals.session.userId;

    if (
      req.body.handle !== undefined &&
      !SharedUtils.isHandleValid(req.body.handle)
    ) {
      throw BadRequest("Handle must only contain A-z 0-9 _ .");
    }

    await sequelize.transaction(async (transaction) => {
      await User.update(
        {
          ...(req.body.name !== undefined ? { name: req.body.name } : {}),
          ...(req.body.handle !== undefined
            ? { handle: req.body.handle.toLowerCase() }
            : {}),
          ...(req.body.enableProfile !== undefined
            ? { enableProfile: req.body.enableProfile }
            : {}),
          ...(req.body.profileVisibility !== undefined
            ? { profileVisibility: req.body.profileVisibility }
            : {}),
        },
        {
          where: {
            id: userId,
          },
          transaction,
        },
      );

      if (req.body.profileItems) {
        await ProfileItem.destroy({
          where: {
            userId,
          },
          transaction,
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
            order: idx,
          };
        });

        await ProfileItem.bulkCreate(profileItems, {
          transaction,
        });
      }

      if (req.body.profileImageIds) {
        const canUploadMultipleImages =
          await SubscriptionService.userHasCapability(
            res.locals.session.userId,
            SubscriptionService.Capabilities.MultipleImages,
          );

        if (!canUploadMultipleImages && req.body.profileImageIds.length > 1) {
          const images = await Image.findAll({
            where: {
              id: {
                [Op.in]: req.body.profileImageIds,
              },
            },
            transaction,
          });
          const imagesById = images.reduce(
            (acc, img) => ({ ...acc, [img.id]: img }),
            {},
          );

          req.body.profileImageIds = req.body.profileImageIds.filter(
            (imageId, idx) =>
              idx === 0 || // Allow first image always (users can always upload the first image)
              imagesById[imageId].userId !== res.locals.session.userId || // Allow images uploaded by others (shared to me)
              moment(imagesById[imageId].createdAt)
                .add(1, "day")
                .isBefore(moment()), // Allow old images (user's subscription expired)
          );
        }

        if (req.body.profileImageIds.length > 10)
          req.body.profileImageIds.splice(10); // Limit to 10 images per recipe max

        await User_Profile_Image.destroy({
          where: {
            userId: res.locals.session.userId,
          },
          transaction,
        });

        await User_Profile_Image.bulkCreate(
          req.body.profileImageIds.map((imageId, idx) => ({
            userId: res.locals.session.userId,
            imageId: imageId,
            order: idx,
          })),
          {
            transaction,
          },
        );
      }
    });

    res.status(200).send("Updated");
  }),
);

router.get(
  "/profile",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    let user = await User.findByPk(res.locals.session.userId, {
      include: [
        {
          model: Image,
          as: "profileImages",
          attributes: ["id", "location"],
        },
      ],
    });

    user = UtilService.sortUserProfileImages(user);

    const profileItems = await ProfileItem.findAll({
      where: {
        userId: res.locals.session.userId,
      },
      include: [
        {
          model: Recipe,
          as: "recipe",
          include: [
            {
              model: Image,
              as: "images",
            },
          ],
        },
        {
          model: Label,
          as: "label",
        },
      ],
    });

    // Note: Should be the same as /profile/:userId
    res.status(200).json({
      id: user.id,
      incomingFriendship: true,
      outgoingFriendship: true,
      isMe: true,
      name: user.name,
      handle: user.handle,
      enableProfile: user.enableProfile,
      profileImages: user.profileImages,
      profileItems,
    });
  }),
);

const getUserProfile = wrapRequestWithErrorHandler(async (req, res) => {
  let profileUserId;
  if (req.params.handle) {
    const user = await User.findOne({
      where: {
        handle: req.params.handle.toLowerCase(),
      },
    });
    if (!user) {
      throw NotFound("User with that handle not found");
    }
    profileUserId = user.id;
  } else {
    profileUserId = req.params.userId;
  }

  const profileUser = await User.findByPk(profileUserId, {
    include: [
      {
        model: Image,
        as: "profileImages",
        attributes: ["id", "location"],
      },
    ],
  });

  if (!profileUser) {
    throw NotFound("User with that id not found");
  }

  if (!profileUser.enableProfile) {
    throw Forbidden("User does not have an active profile");
  }

  let outgoingFriendship = false;
  let incomingFriendship = false;
  if (res.locals.session && res.locals.session.userId) {
    // User is always "friends" with themselves
    if (res.locals.session.userId === profileUserId) {
      incomingFriendship = true;
      outgoingFriendship = true;
    } else {
      const incoming = await Friendship.findOne({
        where: {
          userId: profileUserId,
          friendId: res.locals.session.userId,
        },
      });
      incomingFriendship = !!incoming;

      const outgoing = await Friendship.findOne({
        where: {
          userId: res.locals.session.userId,
          friendId: profileUserId,
        },
      });

      outgoingFriendship = !!outgoing;
    }
  }

  const profileItems = await ProfileItem.findAll({
    where: {
      userId: profileUserId,
      ...(incomingFriendship ? {} : { visibility: "public" }),
    },
    include: [
      {
        model: Recipe,
        as: "recipe",
        include: [
          {
            model: Image,
            as: "images",
          },
        ],
      },
      {
        model: Label,
        as: "label",
      },
    ],
  });

  // Note: Should be the same as /profile
  res.status(200).json({
    id: profileUser.id,
    incomingFriendship,
    outgoingFriendship,
    isMe: res.locals.session && res.locals.session.userId === profileUser.id,
    name: profileUser.name,
    handle: profileUser.handle,
    enableProfile: profileUser.enableProfile,
    profileImages: profileUser.profileImages,
    profileItems,
  });
});

router.get(
  "/profile/by-handle/:handle",
  MiddlewareService.validateSession(["user"], true),
  getUserProfile,
);

router.get(
  "/profile/:userId",
  MiddlewareService.validateSession(["user"], true),
  getUserProfile,
);

router.get(
  "/friends",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const myUserId = res.locals.session.userId;

    const friendshipSummary = await getFriendships(myUserId);

    res.status(200).json(friendshipSummary);
  }),
);

router.post(
  "/friends/:userId",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const profileUserId = req.params.userId;

    if (profileUserId === res.locals.session.userId) {
      throw BadRequest(
        "You can't create a friendship with yourself. I understand if you're friends with yourself in real life, though...",
      );
    }

    await sequelize.transaction(async (transaction) => {
      await Friendship.destroy({
        where: {
          userId: res.locals.session.userId,
          friendId: profileUserId,
        },
        transaction,
      });

      await Friendship.create(
        {
          userId: res.locals.session.userId,
          friendId: profileUserId,
        },
        {
          transaction,
        },
      );
    });

    res.status(201).send("Created");
  }),
);

router.delete(
  "/friends/:userId",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      await Friendship.destroy({
        where: {
          userId: res.locals.session.userId,
          friendId: req.params.userId,
        },
        transaction,
      });

      await Friendship.destroy({
        where: {
          userId: req.params.userId,
          friendId: res.locals.session.userId,
        },
        transaction,
      });
    });

    res.status(200).send("Friendship removed");
  }),
);

router.get(
  "/handle-info/:handle",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const user = await User.findOne({
      where: {
        handle: req.params.handle.toLowerCase(),
      },
      attributes: ["id"],
    });

    res.status(200).json({
      available: !user,
    });
  }),
);

router.get(
  "/capabilities",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const userCapabilities = await SubscriptionService.capabilitiesForUser(
      res.locals.session.userId,
    );

    const capabilityTypes = Object.values(SubscriptionService.Capabilities);

    const capabilityMap = capabilityTypes.reduce((acc, capabilityType) => {
      acc[capabilityType] = userCapabilities.indexOf(capabilityType) > -1;
      return acc;
    }, {});

    res.status(200).json(capabilityMap);
  }),
);

router.get(
  "/stats",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const userId = res.locals.session.userId;

    const recipeCount = await Recipe.count({
      where: {
        userId,
      },
    });

    const recipeImageCount = await Recipe.count({
      where: {
        userId,
      },
      include: [
        {
          model: Image,
          as: "images",
          required: true,
        },
      ],
    });

    const messageCount = await Message.count({
      where: {
        [Op.or]: [
          {
            toUserId: userId,
          },
          {
            fromUserId: userId,
          },
        ],
      },
    });

    res.status(200).json({
      recipeCount,
      recipeImageCount,
      messageCount,
      createdAt: res.locals.user.createdAt,
      lastLogin: res.locals.user.lastLogin,
    });
  }),
);

/* Get public user listing by email */
router.get(
  "/by-email",
  cors(),
  wrapRequestWithErrorHandler(async (req, res) => {
    const user = await User.findOne({
      where: {
        email: UtilService.sanitizeEmail(req.query.email),
      },
      attributes: ["id", "name", "email"],
    });

    if (!user) {
      throw NotFound("No user with that email!");
    }

    res.status(200).json(user);
  }),
);

/* Log in user */
router.post(
  "/login",
  cors(),
  wrapRequestWithErrorHandler(async (req, res) => {
    const token = await sequelize.transaction(async (transaction) => {
      const user = await User.login(
        req.body.email,
        req.body.password,
        transaction,
      );

      // Update lastLogin
      user.lastLogin = Date.now();
      await user.save({ transaction });

      const session = await SessionService.generateSession(
        user.id,
        "user",
        transaction,
      );

      if (
        process.env.NODE_ENV === "selfhost" ||
        process.env.NODE_ENV === "development" ||
        process.env.INDEX_ON_LOGIN === "true"
      ) {
        console.log(user.id);
        const recipes = await Recipe.findAll({
          where: {
            userId: user.id,
          },
          transaction,
        });

        indexRecipes(recipes).catch((e) => {
          console.error(e);
          Sentry.captureException(e);
        });
      }

      return session.token;
    });

    res.status(200).json({
      token,
    });
  }),
);

/* Register as a user */
router.post(
  "/register",
  cors(),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (process.env.DISABLE_REGISTRATION === "true")
      throw new Error("Registration is disabled");

    let sanitizedEmail = UtilService.sanitizeEmail(req.body.email);

    const token = await sequelize.transaction(async (transaction) => {
      if (!UtilService.validateEmail(sanitizedEmail)) {
        let e = new Error("Email is not valid!");
        e.status = 412;
        throw e;
      }

      if (!UtilService.validatePassword(req.body.password)) {
        let e = new Error("Password is not valid!");
        e.status = 411;
        throw e;
      }

      const user = await User.findOne({
        where: {
          email: sanitizedEmail,
        },
        attributes: ["id"],
        transaction,
      });

      if (user) {
        let e = new Error("Account with that email address already exists!");
        e.status = 406;
        throw e;
      }

      let hashedPasswordData = User.generateHashedPassword(req.body.password);

      const newUser = await User.create(
        {
          name: (req.body.name || sanitizedEmail).trim(),
          email: sanitizedEmail,
          passwordHash: hashedPasswordData.hash,
          passwordSalt: hashedPasswordData.salt,
          passwordVersion: hashedPasswordData.version,
        },
        {
          transaction,
        },
      );

      const session = await SessionService.generateSession(
        newUser.id,
        "user",
        transaction,
      );

      return session.token;
    });

    res.status(200).json({
      token,
    });

    sendWelcome([sanitizedEmail], []).catch((err) => {
      Sentry.captureException(err);
    });
  }),
);

/* Forgot password */
router.post(
  "/forgot",
  cors(),
  wrapRequestWithErrorHandler(async (req, res) => {
    let standardStatus = 200;
    let standardResponse = {
      msg: "",
    };

    let origin;
    if (process.env.NODE_ENV === "production") {
      origin = "https://recipesage.com";
    } else {
      // req.get('origin') can be unreliable depending on client browsers. Use only for dev/stg.
      origin = req.get("origin");
    }

    const user = await User.findOne({
      where: {
        email: UtilService.sanitizeEmail(req.body.email),
      },
    });

    if (!user) {
      res.status(standardStatus).json(standardResponse);
    }

    const session = await SessionService.generateSession(user.id, "user");

    const link = `${origin}/#/settings/account?token=${session.token}`;

    await sendPasswordReset([user.email], [], { resetLink: link });

    res.status(standardStatus).json(standardResponse);
  }),
);

/* Update user */
router.put(
  "/",
  cors(),
  MiddlewareService.validateSession(["user"]),
  MiddlewareService.validateUser,
  wrapRequestWithErrorHandler(async (req, res) => {
    const updatedUser = await sequelize.transaction(async (transaction) => {
      const updates = {};

      if (req.body.password) {
        if (!UtilService.validatePassword(req.body.password)) {
          throw PreconditionFailed("Password is not valid!");
        }

        const hashedPasswordData = User.generateHashedPassword(
          req.body.password,
        );

        updates.passwordHash = hashedPasswordData.hash;
        updates.passwordSalt = hashedPasswordData.salt;
        updates.passwordVersion = hashedPasswordData.version;

        await FCMToken.destroy({
          where: {
            userId: res.locals.session.userId,
          },
          transaction,
        });

        await Session.destroy({
          where: {
            userId: res.locals.session.userId,
          },
          transaction,
        });
      }

      if (req.body.email) {
        let sanitizedEmail = UtilService.sanitizeEmail(req.body.email);

        if (!UtilService.validateEmail(sanitizedEmail)) {
          throw PreconditionFailed("Email is not valid!");
        }

        const existingUserWithEmail = await User.findOne({
          where: {
            id: { [Op.ne]: res.locals.session.userId },
            email: sanitizedEmail,
          },
          attributes: ["id"],
          transaction,
        });

        if (existingUserWithEmail) {
          const e = new Error(
            "Account with that email address already exists!",
          );
          e.status = 406;
          throw e;
        }

        updates.email = sanitizedEmail;
      }

      if (
        req.body.name &&
        typeof req.body.name === "string" &&
        req.body.name.length > 0
      ) {
        updates.name = req.body.name;
      }

      const updatedUser = await User.update(updates, {
        where: {
          id: res.locals.session.userId,
        },
        returning: true,
        transaction,
      });

      return updatedUser;
    });

    const { id, name, email, createdAt, updatedAt } = updatedUser;

    res.status(200).json({
      id,
      name,
      email,
      createdAt,
      updatedAt,
    });
  }),
);

router.post(
  "/logout",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    await SessionService.deleteSession(res.locals.session.token);

    res.status(200).json({
      msg: "Session invalidated. User is now logged out.",
    });
  }),
);

/* Check if a session token is valid */
router.get(
  "/sessioncheck",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    res.status(200).send("Ok");
  }),
);

router.post(
  "/fcm/token",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.body.fcmToken) {
      throw PreconditionFailed("fcmToken required");
    }

    const token = await sequelize.transaction(async (transaction) => {
      await FCMToken.destroy({
        where: {
          token: req.body.fcmToken,
          userId: { [Op.ne]: res.locals.session.userId },
        },
        transaction,
      });

      const token = await FCMToken.findOrCreate({
        where: {
          token: req.body.fcmToken,
        },
        defaults: {
          userId: res.locals.session.userId,
          token: req.body.fcmToken,
        },
        transaction,
      });

      return token;
    });

    res.status(200).send(token);
  }),
);

router.delete(
  "/fcm/token",
  cors(),
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    if (!req.query.fcmToken) {
      throw PreconditionFailed("fcmToken required");
    }

    await FCMToken.destroy({
      where: {
        token: req.query.fcmToken,
        userId: res.locals.session.userId,
      },
    });

    res.status(200).send("ok");
  }),
);

/* Get public user listing by id */
router.get(
  "/:userId",
  cors(),
  wrapRequestWithErrorHandler(async (req, res) => {
    const user = await User.findByPk(req.params.userId, {
      attributes: ["id", "name", "handle"],
    });

    if (!user) {
      throw NotFound("User not found");
    }

    res.status(200).json(user);
  }),
);

router.delete(
  "/",
  MiddlewareService.validateSession(["user"]),
  wrapRequestWithErrorHandler(async (req, res) => {
    const userId = res.locals.session.userId;

    await sequelize.transaction(async (transaction) => {
      await Recipe.destroy({
        where: {
          userId,
        },
        transaction,
      });

      await deleteHangingImagesForUser(userId, transaction).catch((e) =>
        Sentry.captureException(e),
      );

      await User.destroy({
        where: {
          id: userId,
        },
        transaction,
      });
    });

    res.status(200).send("ok");
  }),
);

export default router;
