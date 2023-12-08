import * as fs from "fs-extra";
import * as path from "path";
import * as zlib from "zlib";

// Service
import * as FirebaseService from "./firebase.js";
import * as GripService from "./grip.js";

/**
 * DO NOT ADD ANYTHING TO THIS FILE
 * ALL ADDITIONS SHOULD EXIST IN SEPARATE TS FILES
 */

export const dispatchImportNotification = (user, status, reason) => {
  let event;
  if (status === 0) {
    event = "complete";
  } else if (status === 1) {
    event = "failed";
  } else if (status === 2) {
    event = "working";
  } else {
    return;
  }

  let type = "import:pepperplate:" + event;

  const message = {
    type,
    reason: reason || "status",
  };

  let sendQueues = [];
  if (user.fcmTokens) {
    sendQueues.push(
      FirebaseService.sendMessages(
        user.fcmTokens.map((fcmToken) => fcmToken.token),
        message,
      ),
    );
  }

  sendQueues.push(GripService.broadcast(user.id, type, message));

  return Promise.all(sendQueues);
};

export const sortUserProfileImages = (user) => {
  if (user.toJSON) user = user.toJSON();

  if (user.profileImages && user.profileImages.length > 0) {
    user.profileImages.sort(
      (a, b) => a.User_Profile_Image.order - b.User_Profile_Image.order,
    );
  }

  return user;
};

export const sortRecipeImages = (recipe) => {
  if (recipe.toJSON) recipe = recipe.toJSON();

  if (recipe.images && recipe.images.length > 0) {
    recipe.images.sort((a, b) => a.Recipe_Image.order - b.Recipe_Image.order);
  }

  return recipe;
};

export const dispatchMessageNotification = (user, fullMessage) => {
  const message = {
    id: fullMessage.id,
    body: fullMessage.body.substring(0, 1000), // Keep payload size reasonable if there's a long message. Max total payload size is 2048
    otherUser: fullMessage.otherUser,
    fromUser: fullMessage.fromUser,
    toUser: fullMessage.toUser,
  };

  if (fullMessage.recipe) {
    message.recipe = {
      id: fullMessage.recipe.id,
      title: fullMessage.recipe.title,
      images: fullMessage.recipe.images.map((image) => ({
        location: image.location,
      })),
    };
  }

  let sendQueues = [];
  if (user.fcmTokens) {
    const notification = {
      type: "messages:new",
      message: JSON.stringify(message),
    };

    sendQueues.push(
      FirebaseService.sendMessages(
        user.fcmTokens.map((fcmToken) => fcmToken.token),
        notification,
      ),
    );
  }

  sendQueues.push(GripService.broadcast(user.id, "messages:new", message));

  return Promise.all(sendQueues);
};

export const findFilesByRegex = (searchPath, regex) => {
  if (!fs.existsSync(searchPath)) {
    return [];
  }

  return fs.readdirSync(searchPath).reduce((acc, subPath) => {
    let newPath = path.join(searchPath, subPath);

    if (newPath.match(regex)) {
      return [newPath, ...acc];
    }

    if (fs.lstatSync(newPath).isDirectory())
      return [...acc, ...findFilesByRegex(newPath, regex)];

    return acc;
  }, []);
};

export const sanitizeEmail = (email) => (email || "").trim().toLowerCase();

// Very liberal email regex. Don't want to reject valid user emails.
let emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validateEmail = (email) => emailRegex.test(email);

export const validatePassword = (password) =>
  typeof password === "string" && password.length >= 6;

export const gunzip = (buf) => {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buf, (err, result) => {
      if (err) reject(err);
      resolve(result);
    });
  });
};

// CBs are an array of promises to be executed by chunkSize
// Waits until previous is done before executing next chunk
export const executeInChunks = async (cbs, chunkSize) => {
  if (chunkSize < 1) return Promise.resolve();

  let chunks = [];
  for (let i = 0; i < cbs.length; i += chunkSize) {
    chunks.push(cbs.slice(i, i + chunkSize));
  }

  await chunks.reduce((acc, chunk) => {
    return acc.then(() => {
      return Promise.all(chunk.map((cb) => cb()));
    });
  }, Promise.resolve());
};

export const capitalizeEachWord = (input) =>
  input
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.substring(1))
    .join(" ");
