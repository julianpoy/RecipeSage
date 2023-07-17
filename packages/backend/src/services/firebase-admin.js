import admin from "firebase-admin";
import * as fs from "fs/promises";

const init = async () => {
  try {
    const serviceAccount = await fs.readFile(
      "../config/firebase-credentials.json",
      "utf-8"
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://chef-book.firebaseio.com",
    });
  } catch (e) {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.NODE_ENV !== "selfhost"
    ) {
      console.error("Error while initializing firebase for notifications", e);
    }
  }
};

init();

export default {
  admin,
};
