import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import bodyParser from "body-parser";
import request from "supertest";

const validateStripeEventMock = vi.fn();
const findCheckoutUserMock = vi.fn();
const extendSubscriptionMock = vi.fn();
const captureMessageMock = vi.fn();

const stripeEventFindUniqueMock = vi.fn();
const stripeEventCreateMock = vi.fn();
const stripePaymentCreateMock = vi.fn();

vi.mock("@sentry/node", () => ({
  captureMessage: (...args: unknown[]) => captureMessageMock(...args),
  captureException: vi.fn(),
}));

vi.mock("@recipesage/util/server/capabilities", () => ({
  validateStripeEvent: (...args: unknown[]) => validateStripeEventMock(...args),
  findCheckoutUser: (...args: unknown[]) => findCheckoutUserMock(...args),
  extendSubscription: (...args: unknown[]) => extendSubscriptionMock(...args),
  SubscriptionModelName: {
    PyoMonthly: "pyo-monthly",
    PyoYearly: "pyo-yearly",
    PyoSingle: "pyo-single",
    Forever: "forever",
  },
  MONTHLY_PYO_PRODUCT_ID: "pyo-monthly",
  YEARLY_PYO_PRODUCT_ID: "pyo-yearly",
}));

vi.mock("@recipesage/util/server/general", () => ({
  validateSession: vi.fn(),
  extendSession: vi.fn(),
  RateLimitTier: {},
  config: {
    stripe: {
      productId: {
        monthly: "pyo-monthly",
        yearly: "pyo-yearly",
        onetime: "pyo-single",
      },
    },
  },
  metrics: {
    stripeWebhookSuccess: { inc: vi.fn() },
  },
}));

vi.mock("@recipesage/prisma", () => ({
  prisma: {
    stripeEvent: {
      findUnique: (...args: unknown[]) => stripeEventFindUniqueMock(...args),
    },
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        stripeEvent: {
          create: (...args: unknown[]) => stripeEventCreateMock(...args),
        },
        stripePayment: {
          create: (...args: unknown[]) => stripePaymentCreateMock(...args),
        },
      }),
  },
}));

const buildApp = async () => {
  const { stripeRouter } = await import("./index");
  const app = express();
  app.use(bodyParser.json());
  app.use("/stripe", stripeRouter);
  return app;
};

const invoiceEvent = (productId: string | undefined) => ({
  id: "evt_1",
  type: "invoice.payment_succeeded",
  data: {
    object: {
      id: "in_1",
      customer: "cus_1",
      customer_email: "payer@example.com",
      amount_paid: 500,
      parent: { subscription_details: { subscription: "sub_1" } },
      lines: {
        data: [{ pricing: { price_details: { product: productId } } }],
      },
    },
  },
});

describe("POST /stripe/webhook", () => {
  beforeEach(() => {
    validateStripeEventMock.mockReset();
    findCheckoutUserMock.mockReset();
    extendSubscriptionMock.mockReset();
    captureMessageMock.mockReset();
    stripeEventFindUniqueMock.mockReset();
    stripeEventCreateMock.mockReset();
    stripePaymentCreateMock.mockReset();

    stripeEventFindUniqueMock.mockResolvedValue(null);
    findCheckoutUserMock.mockResolvedValue({
      id: "user-1",
      email: "payer@example.com",
    });
  });

  it("records the payment and extends the subscription for a known product", async () => {
    validateStripeEventMock.mockReturnValue(invoiceEvent("pyo-monthly"));

    const app = await buildApp();
    const response = await request(app).post("/stripe/webhook").send({});

    expect(response.status).toBe(200);
    expect(stripeEventCreateMock).toHaveBeenCalledTimes(1);
    expect(stripePaymentCreateMock).toHaveBeenCalledTimes(1);
    expect(extendSubscriptionMock).toHaveBeenCalledWith(
      "user-1",
      "pyo-monthly",
      expect.anything(),
    );
  });

  it("rejects the invoice and records nothing for an unknown product", async () => {
    validateStripeEventMock.mockReturnValue(invoiceEvent("some-other-product"));

    const app = await buildApp();
    const response = await request(app).post("/stripe/webhook").send({});

    expect(response.status).toBe(500);
    expect(stripeEventCreateMock).not.toHaveBeenCalled();
    expect(stripePaymentCreateMock).not.toHaveBeenCalled();
    expect(extendSubscriptionMock).not.toHaveBeenCalled();
    expect(captureMessageMock).toHaveBeenCalledWith(
      "Invoice paid with unknown product",
      expect.anything(),
    );
  });

  it("rejects the invoice and records nothing when the line item has no product", async () => {
    validateStripeEventMock.mockReturnValue(invoiceEvent(undefined));

    const app = await buildApp();
    const response = await request(app).post("/stripe/webhook").send({});

    expect(response.status).toBe(500);
    expect(stripePaymentCreateMock).not.toHaveBeenCalled();
    expect(extendSubscriptionMock).not.toHaveBeenCalled();
  });

  it("does not reprocess an event it has already recorded", async () => {
    stripeEventFindUniqueMock.mockResolvedValue({ id: "existing" });
    validateStripeEventMock.mockReturnValue(invoiceEvent("pyo-monthly"));

    const app = await buildApp();
    const response = await request(app).post("/stripe/webhook").send({});

    expect(response.status).toBe(200);
    expect(stripeEventCreateMock).not.toHaveBeenCalled();
    expect(stripePaymentCreateMock).not.toHaveBeenCalled();
  });
});
