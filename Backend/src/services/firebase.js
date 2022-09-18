var admin = require("firebase-admin");
var Sentry = require('@sentry/node');

// DB
var FCMToken = require('../models').FCMToken;

try {
  var serviceAccount = require("../config/firebase-credentials.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chef-book.firebaseio.com"
  });
} catch(e) {
  console.log("Error while initializing firebase for notifications");
}

let invalidFcmTokenErrors = [
  'messaging/registration-token-not-registered'
]

exports.sendMessages = (tokens, payload) => {
  return Promise.all(tokens.map(token =>
    exports.sendMessage(token, payload)
  ))
}

exports.sendMessage = (token, payload) => {
  var message = {
    data: payload,
    token
  };

  return admin.messaging().send(message).catch(err => {
    if (invalidFcmTokenErrors.indexOf(err.errorInfo.code) > -1) {
      return FCMToken.destroy({
        where: {
          token
        }
      });
    } else {
      Sentry.captureException(err);
    }

    return Promise.resolve();
  });
}
