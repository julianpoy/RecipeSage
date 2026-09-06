import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionPlatform } from "../constants";
import { revokeStoreSubscription } from "./revokeStoreSubscription";

const storeTransactionUpsertMock = vi.fn();
const userSubscriptionUpdateManyMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    storeTransaction: {
      upsert: (...args: unknown[]) => storeTransactionUpsertMock(...args),
    },
    userSubscription: {
      updateMany: (...args: unknown[]) =>
        userSubscriptionUpdateManyMock(...args),
    },
  },
}));

describe("revokeStoreSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeTransactionUpsertMock.mockResolvedValue({
      id: "store-transaction-1",
      userId: "user-1",
    });
    userSubscriptionUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("tombstones the transaction and expires its entitlement", async () => {
    const result = await revokeStoreSubscription(
      SubscriptionPlatform.Apple,
      "transaction-1",
    );

    expect(storeTransactionUpsertMock).toHaveBeenCalledWith({
      where: {
        platform_externalId: {
          platform: "APPLE",
          externalId: "transaction-1",
        },
      },
      create: {
        platform: "APPLE",
        externalId: "transaction-1",
        revokedAt: expect.any(Date),
      },
      update: {
        revokedAt: expect.any(Date),
      },
    });
    expect(userSubscriptionUpdateManyMock).toHaveBeenCalledWith({
      where: {
        platform: "APPLE",
        currentStoreTransactionId: "store-transaction-1",
      },
      data: { expires: new Date(0) },
    });
    expect(result).toEqual({ userId: "user-1", count: 1 });
  });
});
