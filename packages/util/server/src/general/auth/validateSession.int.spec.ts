import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { faker } from "@faker-js/faker";
import { validateSession } from "./validateSession";
import { userFactory } from "../factories";

describe("validateSession", () => {
  let user: User;
  const cleanupIds: string[] = [];

  beforeEach(async () => {
    user = await prisma.user.create({ data: userFactory() });
    cleanupIds.push(user.id);
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds } } });
    cleanupIds.length = 0;
  });

  const createSessionExpiring = async (expires: Date) => {
    return prisma.session.create({
      data: {
        userId: user.id,
        token: faker.string.alphanumeric(40),
        type: "user",
        expires,
      },
    });
  };

  it("returns the session when it has not expired", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const session = await createSessionExpiring(tomorrow);

    const result = await validateSession(session.token);

    expect(result?.id).toEqual(session.id);
  });

  it("returns undefined when the session has expired", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const session = await createSessionExpiring(yesterday);

    const result = await validateSession(session.token);

    expect(result).toBeUndefined();
  });

  it("returns undefined for an unknown token", async () => {
    const result = await validateSession(faker.string.alphanumeric(40));

    expect(result).toBeUndefined();
  });
});
