import { Session } from "@recipesage/prisma";
import { prisma } from "@recipesage/prisma";

export async function validateSession(
  token: string,
): Promise<Session | undefined> {
  const session = await prisma.session.findFirst({
    where: {
      token,
      expires: {
        gte: new Date(),
      },
    },
  });

  return session || undefined;
}
