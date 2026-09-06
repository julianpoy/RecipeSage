import bodyParser from "body-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAppleNotificationMock = vi.fn();
const verifyAppleTransactionMock = vi.fn();
const resolveAppleSubscriptionOwnerMock = vi.fn();
const resolveAppleSubscriptionMock = vi.fn();
const grantStoreSubscriptionMock = vi.fn();
const revokeStoreSubscriptionMock = vi.fn();
const captureMessageMock = vi.fn();
const storeNotificationEventCreateMock = vi.fn();

const { PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  }
  return { PrismaClientKnownRequestError };
});

vi.mock("@sentry/node", () => ({
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
  captureException: vi.fn(),
}));

vi.mock("@recipesage/util/server/capabilities", () => ({
  verifyAppleNotification: (...args: unknown[]) =>
    verifyAppleNotificationMock(...args),
  verifyAppleTransaction: (...args: unknown[]) =>
    verifyAppleTransactionMock(...args),
  resolveAppleSubscriptionOwner: (...args: unknown[]) =>
    resolveAppleSubscriptionOwnerMock(...args),
  resolveAppleSubscription: (...args: unknown[]) =>
    resolveAppleSubscriptionMock(...args),
  grantStoreSubscription: (...args: unknown[]) =>
    grantStoreSubscriptionMock(...args),
  revokeStoreSubscription: (...args: unknown[]) =>
    revokeStoreSubscriptionMock(...args),
  SubscriptionPlatform: {
    Apple: "APPLE",
  },
}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(),
  extendSession: vi.fn(),
  RateLimitTier: {},
  config: {},
}));

vi.mock("@recipesage/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError,
  },
  prisma: {
    $transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        storeNotificationEvent: {
          create: (...args: unknown[]) =>
            storeNotificationEventCreateMock(...args),
        },
      }),
  },
}));

const buildApp = async () => {
  const { iapRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use("/iap", iapRouter);
  return app;
};

const send = (app: express.Express) =>
  request(app)
    .post("/iap/apple/notifications")
    .send({ signedPayload: "signed-notification" });

describe("POST /iap/apple/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyAppleNotificationMock.mockResolvedValue({
      notificationType: "DID_RENEW",
      notificationUUID: "notification-1",
      data: { signedTransactionInfo: "signed-transaction" },
    });
    verifyAppleTransactionMock.mockResolvedValue({
      transactionId: "transaction-1",
      expiresDate: 4102444800000,
    });
    resolveAppleSubscriptionOwnerMock.mockResolvedValue("user-1");
    resolveAppleSubscriptionMock.mockReturnValue({
      name: "pyo-monthly",
      externalId: "transaction-1",
      expires: new Date("2100-01-01"),
    });
    grantStoreSubscriptionMock.mockResolvedValue({
      expires: new Date("2100-01-01"),
    });
    revokeStoreSubscriptionMock.mockResolvedValue({
      userId: "user-1",
      count: 1,
    });
  });

  it("grants an active transaction and records the notification", async () => {
    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(grantStoreSubscriptionMock).toHaveBeenCalledWith(
      "user-1",
      "pyo-monthly",
      "APPLE",
      "transaction-1",
      new Date("2100-01-01"),
      expect.anything(),
    );
    expect(storeNotificationEventCreateMock).toHaveBeenCalledWith({
      data: {
        platform: "APPLE",
        externalId: "notification-1",
        userId: "user-1",
        blob: { signedPayload: "signed-notification" },
      },
    });
  });

  it("revokes a current refunded transaction", async () => {
    verifyAppleNotificationMock.mockResolvedValue({
      notificationType: "REFUND",
      notificationUUID: "notification-1",
      data: { signedTransactionInfo: "signed-transaction" },
    });

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(revokeStoreSubscriptionMock).toHaveBeenCalledWith(
      "APPLE",
      "transaction-1",
      expect.anything(),
    );
    expect(grantStoreSubscriptionMock).not.toHaveBeenCalled();
  });

  it("does not revoke an expired transaction", async () => {
    verifyAppleNotificationMock.mockResolvedValue({
      notificationType: "REFUND",
      notificationUUID: "notification-1",
      data: { signedTransactionInfo: "signed-transaction" },
    });
    verifyAppleTransactionMock.mockResolvedValue({
      transactionId: "transaction-1",
      expiresDate: 946684800000,
    });

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(revokeStoreSubscriptionMock).not.toHaveBeenCalled();
    expect(grantStoreSubscriptionMock).not.toHaveBeenCalled();
    expect(storeNotificationEventCreateMock).toHaveBeenCalledTimes(1);
  });

  it("records other notification types without granting", async () => {
    verifyAppleNotificationMock.mockResolvedValue({
      notificationType: "EXPIRED",
      notificationUUID: "notification-1",
      data: { signedTransactionInfo: "signed-transaction" },
    });

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(grantStoreSubscriptionMock).not.toHaveBeenCalled();
    expect(revokeStoreSubscriptionMock).not.toHaveBeenCalled();
    expect(storeNotificationEventCreateMock).toHaveBeenCalledTimes(1);
  });

  it("records and reports an unknown owner", async () => {
    resolveAppleSubscriptionOwnerMock.mockResolvedValue(undefined);

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(grantStoreSubscriptionMock).not.toHaveBeenCalled();
    expect(storeNotificationEventCreateMock).toHaveBeenCalledTimes(1);
    expect(captureMessageMock).toHaveBeenCalledWith(
      "Apple notification for unknown user",
      expect.anything(),
    );
  });

  it("records notifications without transaction data", async () => {
    verifyAppleNotificationMock.mockResolvedValue({
      notificationType: "TEST",
      notificationUUID: "notification-1",
    });

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(verifyAppleTransactionMock).not.toHaveBeenCalled();
    expect(storeNotificationEventCreateMock).toHaveBeenCalledTimes(1);
  });

  it("treats a duplicate notification as already handled", async () => {
    storeNotificationEventCreateMock.mockRejectedValue(
      new PrismaClientKnownRequestError("duplicate", "P2002"),
    );

    const response = await send(await buildApp());

    expect(response.status).toBe(200);
    expect(response.text).toContain("Already handled");
  });
});
