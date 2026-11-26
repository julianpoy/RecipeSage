/**
 * Convert PEM-encoded SPKI RSA public key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Base64 encode/decode helpers */
export function ab2b64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b642ab(b64: string): ArrayBuffer {
  const u8 = b642u8(b64);
  return u8.buffer;
}

export function b642u8(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface EncryptedOutput {
  v: number;
  alg: "RSA-OAEP-256/AES-GCM";
  iv: string; // base64
  key: string; // base64 (RSA-wrapped AES key)
  ct: string; // base64 (ciphertext || tag)
  kid?: number;
}

export interface RSAPublicKey {
  id: number;
  pem: string;
}

/** Import RSA public key (SPKI PEM, RSA-OAEP SHA-256) */
async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(pem),
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

/** Generate AES-256-GCM key */
async function genAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a blob using AES-GCM, then wrap the AES key with RSA-OAEP.
 */
export async function encryptBlobWithRSAKey(
  u8arr: Uint8Array<ArrayBufferLike>,
  rsaPublicKey: RSAPublicKey,
): Promise<EncryptedOutput> {
  const pubKey = await importRsaPublicKey(rsaPublicKey.pem);
  const aesKey = await genAesKey();

  // Random 12-byte IV for GCM
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    aesKey,
    // The cast here is required because of NodeJS vs Browser type deficiencies
    u8arr as unknown as ArrayBuffer,
  );

  // Export AES key and wrap with RSA-OAEP
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);
  const wrappedKey = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    pubKey,
    rawAes,
  );

  return {
    v: 1,
    alg: "RSA-OAEP-256/AES-GCM",
    iv: ab2b64(initializationVector.buffer),
    key: ab2b64(wrappedKey),
    ct: ab2b64(ciphertext),
    kid: rsaPublicKey.id,
  };
}

/**
 * Encrypt a utf8 string using AES-GCM, then wrap the AES key with RSA-OAEP.
 */
export async function encryptUtf8WithRSAKey(
  utf8String: string,
  rsaPublicKey: RSAPublicKey,
): Promise<EncryptedOutput> {
  const bytes = new TextEncoder().encode(utf8String);

  return encryptBlobWithRSAKey(bytes, rsaPublicKey);
}
