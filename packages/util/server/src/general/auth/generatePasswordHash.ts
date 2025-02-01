import { pbkdf2, randomBytes } from "crypto";
import { promisify } from "util";

const CURRENT_PASSWORD_VERSION = 2;

export const generatePasswordHash = async (password: string) => {
  const salt = randomBytes(128).toString("base64");
  const hash = (
    await promisify(pbkdf2)(password, salt, 10000, 512, "sha512")
  ).toString("base64");

  return {
    hash: hash,
    salt: salt,
    version: CURRENT_PASSWORD_VERSION,
  };
};
