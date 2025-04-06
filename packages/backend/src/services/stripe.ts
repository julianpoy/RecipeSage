import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SK || "no_key_provided");

// DB
import { User } from "../models/index.js";

export async function createOrRetrieveCustomerId(userId: string) {
  const user = await User.findByPk(userId);

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripeCustomer = await stripe.customers.create({
    email: user.email,
  });

  await User.update(
    { stripeCustomerId: stripeCustomer.id },
    { where: { id: userId } },
  );

  return stripeCustomer.id;
}

export async function findCheckoutUser(
  customerId: string,
  customerEmail: string,
) {
  let user = await User.findOne({
    where: {
      stripeCustomerId: customerId,
    },
  });

  if (!user && customerEmail) {
    user = await User.findOne({
      where: {
        email: customerEmail,
      },
    });
  }

  return user;
}

export function createPYOSession(
  isRecurring: boolean,
  {
    amount,
    stripeCustomerId,
    successUrl,
    cancelUrl,
  }: {
    amount: number;
    stripeCustomerId?: string;
    successUrl: string;
    cancelUrl: string;
  },
) {
  if (isRecurring) {
    return createRecurringPYOSession(amount, {
      stripeCustomerId,
      successUrl,
      cancelUrl,
    });
  } else {
    return createSinglePYOSession(amount, {
      stripeCustomerId,
      successUrl,
      cancelUrl,
    });
  }
}

export async function createRecurringPYOSession(
  amount: number,
  {
    stripeCustomerId,
    successUrl,
    cancelUrl,
  }: { stripeCustomerId?: string; successUrl: string; cancelUrl: string },
) {
  const productId = "pyo-monthly";

  let product;

  try {
    product = await stripe.products.retrieve(productId);
  } catch (_e) {
    product = await stripe.products.create({
      id: productId,
      name: "RecipeSage Monthly Membership - Choose Your Own Price",
      type: "service",
    });
  }

  const planId = `pyo-monthly-${amount}`;

  let plan;

  try {
    plan = await stripe.plans.retrieve(planId);
  } catch (_e) {
    plan = await stripe.plans.create({
      id: planId,
      amount: amount,
      interval: "month",
      product: product.id,
      currency: "usd",
    });
  }

  return await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId || undefined,
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price: plan.id,
      },
    ],
  });
}

export async function createSinglePYOSession(
  amount: number,
  {
    stripeCustomerId,
    successUrl,
    cancelUrl,
  }: { stripeCustomerId?: string; successUrl: string; cancelUrl: string },
) {
  return await stripe.checkout.sessions.create({
    mode: "payment",
    customer: stripeCustomerId || undefined,
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: {
            name: "RecipeSage",
            description: "A one-time RecipeSage contribution",
          },
        },
        quantity: 1,
      },
    ],
  });
}

export function validateEvent(
  rawRequestBody: string | Buffer,
  stripeSignature: string | Buffer,
) {
  return stripe.webhooks.constructEvent(
    rawRequestBody,
    stripeSignature,
    process.env.STRIPE_WEBHOOK_SECRET || "no_key_provided",
  );
}
