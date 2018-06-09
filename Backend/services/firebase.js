var admin = require("firebase-admin");

var serviceAccount = require("../config/firebase-credentials.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://chef-book.firebaseio.com"
});

exports.sendMessage = function(fcmToken, payload, success, fail) {
  var message = {
    data: payload,
    token: fcmToken
  };
  
  admin.messaging().send(message)
  .then((response) => {
    success(response);
  })
  .catch((error) => {
    fail(error);
  });
}
