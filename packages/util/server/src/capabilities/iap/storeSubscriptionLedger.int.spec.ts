import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@recipesage/prisma";
import { userFactory } from "../../general/factories";
import { SubscriptionModelName, SubscriptionPlatform } from "../constants";
import { grantStoreSubscription } from "./grantStoreSubscription";
import { revokeStoreSubscription } from "./revokeStoreSubscription";
import { suspendStoreSubscription } from "./suspendStoreSubscription";

describe("store subscription ledger", () => {
  const userIds: string[] = [];
  const externalIds: string[] = [];
  const notificationIds: string[] = [];

  const createUser = async () => {
    const user = await prisma.user.create({ data: userFactory() });
    userIds.push(user.id);
    return user;
  };

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.storeTransaction.deleteMany({
      where: { externalId: { in: externalIds } },
    });
    await prisma.storeNotificationEvent.deleteMany({
      where: { externalId: { in: notificationIds } },
    });
    userIds.length = 0;
    externalIds.length = 0;
    notificationIds.length = 0;
  });

  it("moves an entitlement forward but not backward", async () => {
    const user = await createUser();
    externalIds.push("later-transaction", "earlier-transaction");

    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Apple,
        "later-transaction",
        new Date("2100-01-01"),
        tx,
      ),
    );
    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Apple,
        "earlier-transaction",
        new Date("2099-01-01"),
        tx,
      ),
    );

    const subscription = await prisma.userSubscription.findUniqueOrThrow({
      where: {
        userId_name_platform: {
          userId: user.id,
          name: SubscriptionModelName.PyoMonthly,
          platform: SubscriptionPlatform.Apple,
        },
      },
      include: { currentStoreTransaction: true },
    });
    expect(subscription.expires).toEqual(new Date("2100-01-01"));
    expect(subscription.currentStoreTransaction?.externalId).toBe(
      "later-transaction",
    );
  });

  it("ignores a revocation after a newer transaction replaces the pointer", async () => {
    const user = await createUser();
    externalIds.push("old-token", "new-token");

    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "old-token",
        new Date("2099-01-01"),
        tx,
      ),
    );
    await prisma.$transaction(async (tx) => {
      await revokeStoreSubscription(
        SubscriptionPlatform.Google,
        "old-token",
        tx,
      );
      await grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "new-token",
        new Date("2100-01-01"),
        tx,
      );
    });
    await prisma.$transaction((tx) =>
      revokeStoreSubscription(SubscriptionPlatform.Google, "old-token", tx),
    );

    const subscription = await prisma.userSubscription.findUniqueOrThrow({
      where: {
        userId_name_platform: {
          userId: user.id,
          name: SubscriptionModelName.PyoMonthly,
          platform: SubscriptionPlatform.Google,
        },
      },
    });
    expect(subscription.expires).toEqual(new Date("2100-01-01"));
  });

  it("blocks a grant after revocation is seen first", async () => {
    const user = await createUser();
    externalIds.push("revoked-token");

    await prisma.$transaction((tx) =>
      revokeStoreSubscription(SubscriptionPlatform.Google, "revoked-token", tx),
    );
    const result = await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "revoked-token",
        new Date("2100-01-01"),
        tx,
      ),
    );

    expect(result).toBeUndefined();
    expect(
      await prisma.userSubscription.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it("restores a suspended transaction when it recovers", async () => {
    const user = await createUser();
    externalIds.push("suspended-token");

    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "suspended-token",
        new Date("2099-01-01"),
        tx,
      ),
    );
    await prisma.$transaction((tx) =>
      suspendStoreSubscription(
        SubscriptionPlatform.Google,
        "suspended-token",
        tx,
      ),
    );
    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "suspended-token",
        new Date("2100-01-01"),
        tx,
      ),
    );

    const subscription = await prisma.userSubscription.findUniqueOrThrow({
      where: {
        userId_name_platform: {
          userId: user.id,
          name: SubscriptionModelName.PyoMonthly,
          platform: SubscriptionPlatform.Google,
        },
      },
    });
    expect(subscription.expires).toEqual(new Date("2100-01-01"));
  });

  it("retains transaction and notification history after account deletion", async () => {
    const user = await createUser();
    externalIds.push("deleted-user-token");
    notificationIds.push("deleted-user-notification");

    await prisma.$transaction((tx) =>
      grantStoreSubscription(
        user.id,
        SubscriptionModelName.PyoMonthly,
        SubscriptionPlatform.Google,
        "deleted-user-token",
        new Date("2100-01-01"),
        tx,
      ),
    );
    await prisma.storeNotificationEvent.create({
      data: {
        platform: SubscriptionPlatform.Google,
        externalId: "deleted-user-notification",
        userId: user.id,
        blob: {},
      },
    });
    await prisma.user.delete({ where: { id: user.id } });

    const transaction = await prisma.storeTransaction.findUniqueOrThrow({
      where: {
        platform_externalId: {
          platform: SubscriptionPlatform.Google,
          externalId: "deleted-user-token",
        },
      },
    });
    const notification = await prisma.storeNotificationEvent.findUniqueOrThrow({
      where: {
        platform_externalId: {
          platform: SubscriptionPlatform.Google,
          externalId: "deleted-user-notification",
        },
      },
    });
    expect(transaction.userId).toBeNull();
    expect(notification.userId).toBeNull();
  });
});
