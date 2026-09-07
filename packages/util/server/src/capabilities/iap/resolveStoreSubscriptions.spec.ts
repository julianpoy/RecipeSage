import { describe, expect, it, vi } from "vitest";
import { resolveAppleSubscription } from "./resolveAppleSubscription";
import { resolveGoogleSubscriptions } from "./resolveGoogleSubscriptions";

vi.mock("../resolveStoreSubscriptionModel", () => ({
  resolveStoreSubscriptionModel: (_platform: string, identifier: string) => {
    if (identifier === "monthly") {
      return "pyo-monthly";
    }
    if (identifier === "yearly") {
      return "pyo-yearly";
    }
    return undefined;
  },
}));

describe("store subscription resolution", () => {
  it("uses the Apple transaction ID for the ownership ledger", () => {
    const result = resolveAppleSubscription({
      transactionId: "renewal-transaction",
      originalTransactionId: "subscription-chain",
      productId: "monthly",
      expiresDate: 4102444800000,
    });

    expect(result).toEqual({
      name: "pyo-monthly",
      externalId: "renewal-transaction",
      expires: new Date(4102444800000),
    });
  });

  it("rejects revoked and upgraded Apple transactions", () => {
    expect(
      resolveAppleSubscription({
        transactionId: "transaction-1",
        productId: "monthly",
        expiresDate: 4102444800000,
        revocationDate: 1700000000000,
      }),
    ).toBeUndefined();
    expect(
      resolveAppleSubscription({
        transactionId: "transaction-2",
        productId: "monthly",
        expiresDate: 4102444800000,
        isUpgraded: true,
      }),
    ).toBeUndefined();
  });

  it("keeps each Google base plan paired with its own expiry", () => {
    const result = resolveGoogleSubscriptions({
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [
        {
          offerDetails: { basePlanId: "monthly" },
          expiryTime: "2099-01-01T00:00:00.000Z",
        },
        {
          offerDetails: { basePlanId: "yearly" },
          expiryTime: "2100-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result).toEqual([
      { name: "pyo-monthly", expires: new Date("2099-01-01T00:00:00.000Z") },
      { name: "pyo-yearly", expires: new Date("2100-01-01T00:00:00.000Z") },
    ]);
  });

  it("does not grant Google pending, paused, on-hold, or expired states", () => {
    for (const subscriptionState of [
      "SUBSCRIPTION_STATE_PENDING",
      "SUBSCRIPTION_STATE_PAUSED",
      "SUBSCRIPTION_STATE_ON_HOLD",
      "SUBSCRIPTION_STATE_EXPIRED",
    ]) {
      expect(
        resolveGoogleSubscriptions({
          subscriptionState,
          lineItems: [
            {
              offerDetails: { basePlanId: "monthly" },
              expiryTime: "2100-01-01T00:00:00.000Z",
            },
          ],
        }),
      ).toEqual([]);
    }
  });

  it("grants sandbox and test purchases", () => {
    expect(
      resolveAppleSubscription({
        transactionId: "transaction-1",
        productId: "monthly",
        expiresDate: 4102444800000,
        environment: "Sandbox",
      }),
    ).toBeDefined();
    expect(
      resolveGoogleSubscriptions({
        subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
        testPurchase: {},
        lineItems: [
          {
            offerDetails: { basePlanId: "monthly" },
            expiryTime: "2100-01-01T00:00:00.000Z",
          },
        ],
      }),
    ).toHaveLength(1);
  });
});
