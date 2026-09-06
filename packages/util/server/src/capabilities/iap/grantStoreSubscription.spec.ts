import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionModelName, SubscriptionPlatform } from "../constants";
import { grantStoreSubscription } from "./grantStoreSubscription";

const storeTransactionCreateManyMock = vi.fn();
const storeTransactionFindUniqueMock = vi.fn();
const userSubscriptionCreateManyMock = vi.fn();
const userSubscriptionUpdateManyMock = vi.fn();
const userSubscriptionFindUniqueMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    storeTransaction: {
      createMany: (...args: unknown[]) =>
        storeTransactionCreateManyMock(...args),
      findUnique: (...args: unknown[]) =>
        storeTransactionFindUniqueMock(...args),
    },
    userSubscription: {
      createMany: (...args: unknown[]) =>
        userSubscriptionCreateManyMock(...args),
      updateMany: (...args: unknown[]) =>
        userSubscriptionUpdateManyMock(...args),
      findUnique: (...args: unknown[]) =>
        userSubscriptionFindUniqueMock(...args),
    },
  },
}));

describe("grantStoreSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeTransactionCreateManyMock.mockResolvedValue({ count: 1 });
    storeTransactionFindUniqueMock.mockResolvedValue({
      id: "store-transaction-1",
      userId: "user-1",
      revokedAt: null,
    });
    userSubscriptionCreateManyMock.mockResolvedValue({ count: 1 });
    userSubscriptionUpdateManyMock.mockResolvedValue({ count: 0 });
    userSubscriptionFindUniqueMock.mockResolvedValue({
      id: "subscription-1",
      expires: new Date("2100-01-01"),
    });
  });

  it("claims the transaction and advances the entitlement", async () => {
    const expires = new Date("2100-01-01");

    await grantStoreSubscription(
      "user-1",
      SubscriptionModelName.PyoMonthly,
      SubscriptionPlatform.Google,
      "token-1",
      expires,
    );

    expect(userSubscriptionUpdateManyMock).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        name: "pyo-monthly",
        platform: "GOOGLE",
        expires: { lt: expires },
      },
      data: {
        expires,
        currentStoreTransactionId: "store-transaction-1",
      },
    });
  });

  it("refuses a transaction owned by another user", async () => {
    storeTransactionFindUniqueMock.mockResolvedValue({
      id: "store-transaction-1",
      userId: "user-2",
      revokedAt: null,
    });

    const result = await grantStoreSubscription(
      "user-1",
      SubscriptionModelName.PyoMonthly,
      SubscriptionPlatform.Google,
      "token-1",
      new Date("2100-01-01"),
    );

    expect(result).toBeUndefined();
    expect(userSubscriptionCreateManyMock).not.toHaveBeenCalled();
  });

  it("refuses a revoked transaction", async () => {
    storeTransactionFindUniqueMock.mockResolvedValue({
      id: "store-transaction-1",
      userId: "user-1",
      revokedAt: new Date(),
    });

    const result = await grantStoreSubscription(
      "user-1",
      SubscriptionModelName.PyoMonthly,
      SubscriptionPlatform.Google,
      "token-1",
      new Date("2100-01-01"),
    );

    expect(result).toBeUndefined();
    expect(userSubscriptionCreateManyMock).not.toHaveBeenCalled();
  });
});
