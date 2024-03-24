import { Session } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { randomBytes } from "node:crypto";

export enum SessionType {
  User = "user",
}

const SESSION_VALIDITY_LENGTH_DAYS = 30;

/*
 * Creates a session in the DB
 */
export const generateSession = (
  userId: string,
  type: SessionType,
): Promise<Session> => {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_VALIDITY_LENGTH_DAYS);

  const token = randomBytes(48).toString("hex");

  return prisma.session.create({
    data: {
      userId,
      type,
      token,
      expires,
    },
  });
};
