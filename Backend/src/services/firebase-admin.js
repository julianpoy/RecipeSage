const admin = require("firebase-admin");

try {
  const serviceAccount = require("../config/firebase-credentials.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chef-book.firebaseio.com"
  });
} catch(e) {
  console.log("Error while initializing firebase for notifications");
}

module.exports = {
  admin,
};
