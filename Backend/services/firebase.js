var admin = require("firebase-admin");

var serviceAccount = require("../config/firebase-credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chef-book.firebaseio.com"
});

exports.sendMessage = function(fcmToken, payload) {
  var message = {
    data: payload,
    token: fcmToken
  };

  admin.messaging().send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });
}
