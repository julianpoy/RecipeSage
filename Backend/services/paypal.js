const paypal = require('paypal-rest-sdk');

const mode = process.env.NODE_ENV == 'production' ? 'live' : 'sandbox';

paypal.configure({
  mode,
  client_id: process.env.RS_PAYPAL_CLIENT_ID,
  client_secret: process.env.RS_PAYPAL_CLIENT_SECRET
});

exports.verifyWebhook = (headers, eventBody, webhookId) => {
  return new Promise((resolve, reject) => {
    paypal.notification.webhookEvent.verify(headers, eventBody, webhookId, (error, response) => {
      if (error) {
        reject(error);
      } else {
        if (response.verification_status === "SUCCESS") resolve();
        else reject("Unauthorized");
      }
    });
  });
}
