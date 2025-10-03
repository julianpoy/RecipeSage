import type { EncryptedOutput } from "@recipesage/util/shared";
import { constants, privateDecrypt, createDecipheriv } from "crypto";

/**
 * Decrypt a payload produced by encryptWithRSAKey.
 *
 * @param payload JSON payload returned by encryptWithRSAKey (already parsed or as string)
 * @param privateKeyPem The RSA private key in PEM format (PKCS#8 or PKCS#1)
 */
export function decryptWithRSAKey(
  payload: EncryptedOutput | string,
  privateKeyPem: string,
): Uint8Array<ArrayBufferLike> {
  const data: EncryptedOutput =
    typeof payload === "string" ? JSON.parse(payload) : payload;

  if (data.alg !== "RSA-OAEP-256/AES-GCM") {
    throw new Error(`Unexpected alg: ${data.alg}`);
  }

  // Unwrap AES key with RSA-OAEP-SHA256
  const rawAesKey = privateDecrypt(
    {
      key: privateKeyPem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(data.key, "base64"),
  );

  // Split ciphertext and tag (WebCrypto concatenates them: ct || tag)
  const ctBuf = Buffer.from(data.ct, "base64");
  const tag = ctBuf.subarray(ctBuf.length - 16);
  const ciphertext = ctBuf.subarray(0, ctBuf.length - 16);

  // AES-GCM decrypt
  const decipher = createDecipheriv(
    "aes-256-gcm",
    rawAesKey,
    Buffer.from(data.iv, "base64"),
  );
  decipher.setAuthTag(tag);

  const result = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return result;
}
