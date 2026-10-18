export const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const createPkceChallenge = async (
  verifierStorageKey: string,
): Promise<string> => {
  let verifier = localStorage.getItem(verifierStorageKey);
  if (!verifier) {
    verifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    localStorage.setItem(verifierStorageKey, verifier);
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64UrlEncode(new Uint8Array(digest));
};
