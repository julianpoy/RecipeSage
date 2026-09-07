import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubscriptionModelName } from "../constants";
import {
  applyGoogleSubscriptions,
  StoreTransactionOwnershipError,
} from "./applyGoogleSubscriptions";

const grantStoreSubscriptionMock = vi.fn();
const revokeStoreSubscriptionMock = vi.fn();

vi.mock("@recipesage/prisma", () => ({
  prisma: {},
}));

vi.mock("./grantStoreSubscription", () => ({
  grantStoreSubscription: (...args: unknown[]) =>
    grantStoreSubscriptionMock(...args),
}));

vi.mock("./revokeStoreSubscription", () => ({
  revokeStoreSubscription: (...args: unknown[]) =>
    revokeStoreSubscriptionMock(...args),
}));

describe("applyGoogleSubscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grantStoreSubscriptionMock.mockResolvedValue({
      expires: new Date("2100-01-01"),
    });
    revokeStoreSubscriptionMock.mockResolvedValue({
      userId: "user-1",
      count: 1,
    });
  });

  it("revokes the linked token before granting the replacement", async () => {
    await applyGoogleSubscriptions(
      "user-1",
      "new-token",
      [
        {
          name: SubscriptionModelName.PyoMonthly,
          expires: new Date("2100-01-01"),
        },
      ],
      "old-token",
    );

    expect(revokeStoreSubscriptionMock).toHaveBeenCalledWith(
      "GOOGLE",
      "old-token",
      expect.anything(),
    );
    expect(
      revokeStoreSubscriptionMock.mock.invocationCallOrder[0],
    ).toBeLessThan(grantStoreSubscriptionMock.mock.invocationCallOrder[0]);
  });

  it("does not revoke when there is no linked token", async () => {
    await applyGoogleSubscriptions(
      "user-1",
      "token-1",
      [
        {
          name: SubscriptionModelName.PyoMonthly,
          expires: new Date("2100-01-01"),
        },
      ],
      null,
    );

    expect(revokeStoreSubscriptionMock).not.toHaveBeenCalled();
  });

  it("returns the latest expiry across line items", async () => {
    grantStoreSubscriptionMock
      .mockResolvedValueOnce({ expires: new Date("2099-01-01") })
      .mockResolvedValueOnce({ expires: new Date("2100-06-01") });

    const expires = await applyGoogleSubscriptions(
      "user-1",
      "token-1",
      [
        {
          name: SubscriptionModelName.PyoMonthly,
          expires: new Date("2099-01-01"),
        },
        {
          name: SubscriptionModelName.PyoYearly,
          expires: new Date("2100-06-01"),
        },
      ],
      null,
    );

    expect(expires).toEqual(new Date("2100-06-01"));
  });

  it("throws on an ownership conflict", async () => {
    grantStoreSubscriptionMock.mockResolvedValue(undefined);

    await expect(
      applyGoogleSubscriptions(
        "user-1",
        "token-1",
        [
          {
            name: SubscriptionModelName.PyoMonthly,
            expires: new Date("2100-01-01"),
          },
        ],
        null,
      ),
    ).rejects.toBeInstanceOf(StoreTransactionOwnershipError);
  });
});
