const stripe = require('stripe')(process.env.RS_STRIPE_SK);

exports.checkoutSingle = (amount, successUrl, cancelUrl) => {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      name: 'RecipeSage',
      description: 'A one-time RecipeSage contribution',
      amount: amount,
      currency: 'usd',
      quantity: 1,
    }],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
};

exports.checkoutRecurring = (planId, successUrl, cancelUrl) => {
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    subscription_data: {
      items: [{
        plan: planId,
      }],
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}
