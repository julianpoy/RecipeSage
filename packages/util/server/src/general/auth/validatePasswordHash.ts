import { promisify } from "util";
import { pbkdf2 } from "crypto";

export const validatePasswordHash = async (
  providedPassword: string,
  user: {
    passwordVersion: number;
    passwordSalt: string;
    passwordHash: string;
  },
): Promise<boolean> => {
  switch (user.passwordVersion) {
    case 1: {
      throw new Error("Password version 1 is no longer supported");
    }
    case 2: {
      const providedHash = (
        await promisify(pbkdf2)(
          providedPassword,
          user.passwordSalt,
          10000,
          512,
          "sha512",
        )
      ).toString("base64");

      return user.passwordHash === providedHash;
    }
  }

  throw new Error("Unsupported password version");
};
