import crypto from "node:crypto";
import { getRedirectAppleRefreshTokenEncryptionKey } from "./getRedirectAppleRefreshTokenEncryptionKey";

export const decryptRedirectAppleRefreshToken = (
  encryptedRefreshToken: string,
): string => {
  const data = Buffer.from(encryptedRefreshToken, "base64url");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getRedirectAppleRefreshTokenEncryptionKey(),
    iv,
  );
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
};
