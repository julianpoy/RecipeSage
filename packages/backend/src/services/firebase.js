import { admin } from "./firebase-admin";
import * as Sentry from "@sentry/node";

// DB
import { FCMToken } from "../models/index.js";

let invalidFcmTokenErrors = ["messaging/registration-token-not-registered"];

export const sendMessages = (tokens, payload) => {
  return Promise.all(
    tokens.map((token) => exports.sendMessage(token, payload)),
  );
};

export const sendMessage = (token, payload) => {
  const message = {
    data: payload,
    token,
  };

  return admin
    .messaging()
    .send(message)
    .catch((err) => {
      if (invalidFcmTokenErrors.indexOf(err.errorInfo.code) > -1) {
        return FCMToken.destroy({
          where: {
            token,
          },
        });
      } else {
        Sentry.captureException(err);
      }

      return Promise.resolve();
    });
};
