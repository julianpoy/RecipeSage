const stripe = require('stripe')(process.env.RS_STRIPE_SK);

exports.createSession = async (isRecurring, { amount, email, successUrl, cancelUrl }) => {
  let checkoutData;

  if (isRecurring) {
    const plan = await stripe.plans.create({
      amount: amount,
      interval: "month",
      product: {
        name: "RecipeSage Monthly - Choose Your Own Price"
      },
      currency: "usd",
    });

    checkoutData = {
      subscription_data: {
        items: [{
          plan: plan.id,
        }],
      }
    };
  } else {
    checkoutData = {
      line_items: [{
        name: 'RecipeSage',
        description: 'A one-time RecipeSage contribution',
        amount: amount,
        currency: 'usd',
        quantity: 1,
      }]
    };
  }

  return await stripe.checkout.sessions.create({
    customer_email: email,
    payment_method_types: ['card'],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...checkoutData
  });
};
