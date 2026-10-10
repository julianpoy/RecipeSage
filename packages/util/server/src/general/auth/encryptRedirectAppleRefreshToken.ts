import crypto from "node:crypto";
import { getRedirectAppleRefreshTokenEncryptionKey } from "./getRedirectAppleRefreshTokenEncryptionKey";

export const encryptRedirectAppleRefreshToken = (
  refreshToken: string,
): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getRedirectAppleRefreshTokenEncryptionKey(),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(refreshToken, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
};
