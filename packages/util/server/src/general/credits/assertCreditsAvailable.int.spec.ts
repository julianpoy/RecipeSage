import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma, User } from "@recipesage/prisma";
import { assertCreditsAvailable } from "./assertCreditsAvailable";
import { FREE_DAILY_CREDITS } from "./creditCosts";
import { CreditLimitExceededError } from "./errors";
import { userFactory } from "../factories";
import { extendSubscription, SubscriptionModelName } from "../../capabilities";

describe("assertCreditsAvailable", () => {
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

  it("throws once the daily limit is reached", async () => {
    await prisma.userCreditLog.create({
      data: {
        userId: user.id,
        operation: "mlOcr",
        credits: FREE_DAILY_CREDITS,
      },
    });

    await expect(assertCreditsAvailable(user.id, "mlOcr")).rejects.toThrow(
      CreditLimitExceededError,
    );
  });

  it("does not throw on self-host past the limit for an activated user", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "selfhost";
    try {
      await extendSubscription(user.id, SubscriptionModelName.Forever);
      await prisma.userCreditLog.create({
        data: {
          userId: user.id,
          operation: "mlOcr",
          credits: FREE_DAILY_CREDITS,
        },
      });

      await expect(
        assertCreditsAvailable(user.id, "mlOcr"),
      ).resolves.toBeUndefined();
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
