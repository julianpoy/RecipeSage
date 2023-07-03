import admin from "firebase-admin";

try {
  const serviceAccount = require("../config/firebase-credentials.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chef-book.firebaseio.com",
  });
} catch (e) {
  if (process.env.NODE_ENV !== "test") {
    console.error("Error while initializing firebase for notifications");
  }
}

export default {
  admin,
};
