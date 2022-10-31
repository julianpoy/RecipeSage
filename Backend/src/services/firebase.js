const { admin } = require('./firebase-admin');
var Sentry = require('@sentry/node');

// DB
var FCMToken = require('../models').FCMToken;

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
