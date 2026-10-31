import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeGoogleSubscription } from "./acknowledgeGoogleSubscription";

const acknowledgeMock = vi.fn();

vi.mock("../../general/config", () => ({
  config: { google: { iap: { packageName: "com.recipesage.app" } } },
}));

vi.mock("./getGooglePublisher", () => ({
  getGooglePublisher: () => ({
    purchases: {
      subscriptions: {
        acknowledge: (...args: unknown[]) => acknowledgeMock(...args),
      },
    },
  }),
}));

describe("acknowledgeGoogleSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acknowledgeMock.mockResolvedValue(undefined);
  });

  it("sends the product ID as the subscription ID", async () => {
    await acknowledgeGoogleSubscription("token-1", {
      lineItems: [{ productId: "premium-monthly" }],
    });

    expect(acknowledgeMock).toHaveBeenCalledWith({
      packageName: "com.recipesage.app",
      subscriptionId: "premium-monthly",
      token: "token-1",
    });
  });

  it("uses the first line item that has a product ID", async () => {
    await acknowledgeGoogleSubscription("token-1", {
      lineItems: [{ productId: null }, { productId: "premium-yearly" }],
    });

    expect(acknowledgeMock).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "premium-yearly" }),
    );
  });

  it("throws without calling Google when no line item has a product ID", async () => {
    await expect(
      acknowledgeGoogleSubscription("token-1", {
        lineItems: [{ productId: null }],
      }),
    ).rejects.toThrow("Subscription has no product ID to acknowledge");

    expect(acknowledgeMock).not.toHaveBeenCalled();
  });
});
