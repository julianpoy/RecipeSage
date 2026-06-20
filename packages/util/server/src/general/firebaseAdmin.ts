import * as Sentry from "@sentry/node";
import admin, { type ServiceAccount } from "firebase-admin";
import { readFile } from "fs/promises";
import { join } from "path";
import { IS_FIREBASE_AVAILABLE } from "./isFirebaseAvailable";

let initPromise: Promise<typeof admin | null> | undefined;

const init = async (): Promise<typeof admin | null> => {
  if (!IS_FIREBASE_AVAILABLE) return null;

  if (admin.apps.length > 0) return admin;

  try {
    const credentialsPath =
      process.env.FIREBASE_CREDENTIALS_PATH ||
      join(process.cwd(), ".credentials/firebase.json");
    const serviceAccount: ServiceAccount = JSON.parse(
      await readFile(credentialsPath, "utf-8"),
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://chef-book.firebaseio.com",
    });

    return admin;
  } catch (e) {
    if (
      process.env.NODE_ENV !== "test" &&
      process.env.NODE_ENV !== "selfhost"
    ) {
      console.error("Error while initializing firebase for notifications", e);
      Sentry.captureException(e);
    }
    return null;
  }
};

export const getFirebaseAdmin = (): Promise<typeof admin | null> => {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
};
