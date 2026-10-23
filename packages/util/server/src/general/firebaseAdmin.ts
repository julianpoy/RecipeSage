import * as Sentry from "@sentry/node";
import {
  type App,
  type ServiceAccount,
  cert,
  getApp,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { readFile } from "fs/promises";
import { join } from "path";
import { IS_FIREBASE_AVAILABLE } from "./isFirebaseAvailable";
import { config, Environment } from "./config";

let initPromise: Promise<App | null> | undefined;

const init = async (): Promise<App | null> => {
  if (!IS_FIREBASE_AVAILABLE) return null;

  if (getApps().length > 0) return getApp();

  try {
    const credentialsPath =
      process.env.FIREBASE_CREDENTIALS_PATH ||
      join(process.cwd(), ".credentials/firebase.json");
    const serviceAccount: ServiceAccount = JSON.parse(
      await readFile(credentialsPath, "utf-8"),
    );

    return initializeApp({
      credential: cert(serviceAccount),
      databaseURL: "https://chef-book.firebaseio.com",
    });
  } catch (e) {
    if (
      config.environment !== Environment.Test &&
      config.environment !== Environment.Selfhost
    ) {
      console.error("Error while initializing firebase for notifications", e);
      Sentry.captureException(e);
    }
    return null;
  }
};

export const getFirebaseAdmin = (): Promise<App | null> => {
  if (!initPromise) {
    initPromise = init();
  }
  return initPromise;
};
