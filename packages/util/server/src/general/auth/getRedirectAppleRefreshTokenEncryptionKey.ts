import crypto from "node:crypto";
import { config } from "../config";

export const getRedirectAppleRefreshTokenEncryptionKey = (): Buffer => {
  const { privateKey } = config.apple.signIn;
  if (!privateKey) {
    throw new Error("Apple Sign In is not configured");
  }

  return crypto
    .createHash("sha256")
    .update(`redirect-apple-refresh-token.${privateKey}`)
    .digest();
};
