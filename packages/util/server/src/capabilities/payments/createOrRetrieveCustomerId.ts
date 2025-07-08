import { prisma } from "@recipesage/prisma";
import { stripe } from "./stripe";

export async function createOrRetrieveCustomerId(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
  });

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripeCustomer = await stripe.customers.create({
    email: user.email,
  });

  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      stripeCustomerId: stripeCustomer.id,
    },
  });

  return stripeCustomer.id;
}
