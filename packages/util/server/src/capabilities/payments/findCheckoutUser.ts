import { prisma } from "@recipesage/prisma";

export async function findCheckoutUser(
  customerId: string,
  customerEmail: string,
) {
  let user = await prisma.user.findFirst({
    where: {
      stripeCustomerId: customerId,
    },
  });

  if (!user && customerEmail) {
    user = await prisma.user.findUnique({
      where: {
        email: customerEmail,
      },
    });
  }

  return user;
}
