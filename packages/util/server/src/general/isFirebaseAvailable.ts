import { existsSync } from "node:fs";
import { join } from "path";

export const IS_FIREBASE_AVAILABLE = existsSync(
  join(__dirname, "../../../../../.credentials/firebase.json"),
);

if (!IS_FIREBASE_AVAILABLE && process.env.NODE_ENV === "production") {
  throw new Error("Firebase credentials not found");
}
