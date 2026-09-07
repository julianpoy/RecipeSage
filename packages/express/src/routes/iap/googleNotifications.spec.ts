import bodyParser from "body-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getGoogleSubscriptionMock = vi.fn();
const acknowledgeGoogleSubscriptionMock = vi.fn();
const resolveGoogleSubscriptionOwnerMock = vi.fn();
const resolveGoogleSubscriptionsMock = vi.fn();
const applyGoogleSubscriptionsMock = vi.fn();
const revokeStoreSubscriptionMock = vi.fn();
const suspendStoreSubscriptionMock = vi.fn();
const storeNotificationEventFindUniqueMock = vi.fn();
const storeNotificationEventCreateMock = vi.fn();
const captureMessageMock = vi.fn();

const { StoreTransactionOwnershipError, PrismaClientKnownRequestError } =
  vi.hoisted(() => {
    class StoreTransactionOwnershipError extends Error {}
    class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    }
    return { StoreTransactionOwnershipError, PrismaClientKnownRequestError };
  });

vi.mock("@sentry/node", () => ({
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
  captureException: vi.fn(),
}));

vi.mock("@recipesage/util/server/capabilities", () => ({
  acknowledgeGoogleSubscription: (...args: unknown[]) =>
    acknowledgeGoogleSubscriptionMock(...args),
  applyGoogleSubscriptions: (...args: unknown[]) =>
    applyGoogleSubscriptionsMock(...args),
  getGoogleSubscription: (...args: unknown[]) =>
    getGoogleSubscriptionMock(...args),
  resolveGoogleSubscriptionOwner: (...args: unknown[]) =>
    resolveGoogleSubscriptionOwnerMock(...args),
  resolveGoogleSubscriptions: (...args: unknown[]) =>
    resolveGoogleSubscriptionsMock(...args),
  revokeStoreSubscription: (...args: unknown[]) =>
    revokeStoreSubscriptionMock(...args),
  suspendStoreSubscription: (...args: unknown[]) =>
    suspendStoreSubscriptionMock(...args),
  StoreTransactionOwnershipError,
  SubscriptionPlatform: {
    Google: "GOOGLE",
  },
}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(),
  extendSession: vi.fn(),
  RateLimitTier: {},
  config: {
    google: {
      iap: {
        pubsubVerificationToken: "secret",
      },
    },
  },
}));

vi.mock("@recipesage/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError,
  },
  prisma: {
    storeNotificationEvent: {
      findUnique: (...args: unknown[]) =>
        storeNotificationEventFindUniqueMock(...args),
      create: (...args: unknown[]) => storeNotificationEventCreateMock(...args),
    },
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        storeNotificationEvent: {
          create: (...args: unknown[]) =>
            storeNotificationEventCreateMock(...args),
        },
      }),
  },
}));

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64");

const buildApp = async () => {
  const { iapRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use("/iap", iapRouter);
  return app;
};

const send = (app: express.Express, data: unknown, token = "secret") =>
  request(app)
    .post(`/iap/google/notifications?token=${token}`)
    .send({ message: { data: encode(data), messageId: "message-1" } });

describe("POST /iap/google/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeNotificationEventFindUniqueMock.mockResolvedValue(null);
    storeNotificationEventCreateMock.mockResolvedValue({ id: "event-1" });
    getGoogleSubscriptionMock.mockResolvedValue({
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      lineItems: [{ productId: "premium-monthly", expiryTime: "2100-01-01" }],
    });
    resolveGoogleSubscriptionOwnerMock.mockResolvedValue("user-1");
    resolveGoogleSubscriptionsMock.mockReturnValue([
      { name: "pyo-monthly", expires: new Date("2100-01-01") },
    ]);
    applyGoogleSubscriptionsMock.mockResolvedValue(new Date("2100-01-01"));
    revokeStoreSubscriptionMock.mockResolvedValue({
      userId: "user-1",
      count: 1,
    });
    suspendStoreSubscriptionMock.mockResolvedValue({
      userId: "user-1",
      count: 1,
    });
    acknowledgeGoogleSubscriptionMock.mockResolvedValue(undefined);
  });

  it("rejects an invalid verification token", async () => {
    const response = await send(
      await buildApp(),
      { subscriptionNotification: { purchaseToken: "token-1" } },
      "wrong",
    );

    expect(response.status).toBe(401);
    expect(getGoogleSubscriptionMock).not.toHaveBeenCalled();
  });

  it("grants and acknowledges an active subscription", async () => {
    const notification = {
      subscriptionNotification: { purchaseToken: "token-1" },
    };
    const response = await send(await buildApp(), notification);

    expect(response.status).toBe(200);
    expect(applyGoogleSubscriptionsMock).toHaveBeenCalledWith(
      "user-1",
      "token-1",
      [{ name: "pyo-monthly", expires: new Date("2100-01-01") }],
      undefined,
      expect.anything(),
    );
    expect(acknowledgeGoogleSubscriptionMock).toHaveBeenCalledWith("token-1");
    expect(storeNotificationEventCreateMock).toHaveBeenCalledWith({
      data: {
        platform: "GOOGLE",
        externalId: "message-1",
        userId: "user-1",
        blob: { payload: JSON.stringify(notification) },
      },
    });
  });

  it("does not reprocess a recorded notification", async () => {
    storeNotificationEventFindUniqueMock.mockResolvedValue({ id: "existing" });

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "token-1" },
    });

    expect(response.status).toBe(200);
    expect(getGoogleSubscriptionMock).not.toHaveBeenCalled();
  });

  it("treats a duplicate notification insert as already handled", async () => {
    storeNotificationEventCreateMock.mockRejectedValue(
      new PrismaClientKnownRequestError("duplicate", "P2002"),
    );

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "token-1" },
    });

    expect(response.status).toBe(200);
    expect(response.text).toContain("Already handled");
  });

  it("revokes a subscription for notification type 12", async () => {
    const response = await send(await buildApp(), {
      subscriptionNotification: {
        purchaseToken: "token-1",
        notificationType: 12,
      },
    });

    expect(response.status).toBe(200);
    expect(revokeStoreSubscriptionMock).toHaveBeenCalledWith(
      "GOOGLE",
      "token-1",
      expect.anything(),
    );
    expect(getGoogleSubscriptionMock).not.toHaveBeenCalled();
  });

  it("revokes a voided subscription purchase", async () => {
    const response = await send(await buildApp(), {
      voidedPurchaseNotification: {
        purchaseToken: "token-1",
        orderId: "order-1",
        productType: 1,
      },
    });

    expect(response.status).toBe(200);
    expect(revokeStoreSubscriptionMock).toHaveBeenCalledWith(
      "GOOGLE",
      "token-1",
      expect.anything(),
    );
  });

  it("records and reports a pending refund review", async () => {
    const notification = {
      pendingRefundReviewNotification: {
        pendingRefundToken: "refund-token-1",
        orderId: "order-1",
        refundReason: 7,
      },
    };
    const response = await send(await buildApp(), notification);

    expect(response.status).toBe(200);
    expect(storeNotificationEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        blob: { payload: JSON.stringify(notification) },
      }),
    });
    expect(captureMessageMock).toHaveBeenCalledWith(
      "Google pending refund review received",
      expect.anything(),
    );
  });

  it("suspends an account-hold subscription", async () => {
    getGoogleSubscriptionMock.mockResolvedValue({
      subscriptionState: "SUBSCRIPTION_STATE_ON_HOLD",
    });

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "token-1" },
    });

    expect(response.status).toBe(200);
    expect(suspendStoreSubscriptionMock).toHaveBeenCalledWith(
      "GOOGLE",
      "token-1",
      expect.anything(),
    );
    expect(applyGoogleSubscriptionsMock).not.toHaveBeenCalled();
  });

  it("passes the linked token through when replacing a subscription", async () => {
    getGoogleSubscriptionMock.mockResolvedValue({
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      linkedPurchaseToken: "old-token",
      lineItems: [{ productId: "premium-monthly", expiryTime: "2100-01-01" }],
    });

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "new-token" },
    });

    expect(response.status).toBe(200);
    expect(applyGoogleSubscriptionsMock).toHaveBeenCalledWith(
      "user-1",
      "new-token",
      expect.anything(),
      "old-token",
      expect.anything(),
    );
  });

  it("records a conflict and does not acknowledge on ownership conflict", async () => {
    applyGoogleSubscriptionsMock.mockRejectedValue(
      new StoreTransactionOwnershipError(),
    );

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "token-1" },
    });

    expect(response.status).toBe(200);
    expect(acknowledgeGoogleSubscriptionMock).not.toHaveBeenCalled();
    expect(storeNotificationEventCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1" }),
    });
    expect(captureMessageMock).toHaveBeenCalledWith(
      "Google transaction ownership conflict",
      expect.anything(),
    );
  });

  it("does not record the event when acknowledgement fails", async () => {
    acknowledgeGoogleSubscriptionMock.mockRejectedValue(
      new Error("acknowledgement failed"),
    );

    const response = await send(await buildApp(), {
      subscriptionNotification: { purchaseToken: "token-1" },
    });

    expect(response.status).toBe(500);
    expect(storeNotificationEventCreateMock).not.toHaveBeenCalled();
  });
});
