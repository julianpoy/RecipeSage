import stripeInit from "stripe";
const stripe = stripeInit(process.env.STRIPE_SK);

// DB
import { User } from "../models/index.js";

export const createOrRetrieveCustomerId = async (userId) => {
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
};

export const findCheckoutUser = async (customerId, customerEmail) => {
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
};

export const createPYOSession = async (
  isRecurring,
  { amount, stripeCustomerId, successUrl, cancelUrl },
) => {
  let checkoutData;

  if (isRecurring) {
    const productId = "pyo-monthly";

    let product;

    try {
      product = await stripe.products.retrieve(productId);
    } catch (e) {
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
    } catch (e) {
      plan = await stripe.plans.create({
        id: planId,
        amount: amount,
        interval: "month",
        product: product.id,
        currency: "usd",
      });
    }

    checkoutData = {
      subscription_data: {
        items: [
          {
            plan: plan.id,
          },
        ],
      },
    };
  } else {
    checkoutData = {
      line_items: [
        {
          name: "RecipeSage",
          description: "A one-time RecipeSage contribution",
          amount: amount,
          currency: "usd",
          quantity: 1,
        },
      ],
    };
  }

  return await stripe.checkout.sessions.create({
    customer: stripeCustomerId || undefined,
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...checkoutData,
  });
};

export const validateEvent = (rawRequestBody, stripeSignature) => {
  return stripe.webhooks.constructEvent(
    rawRequestBody,
    stripeSignature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
};
