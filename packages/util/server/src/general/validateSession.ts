import { Session } from "@prisma/client";
import { prisma } from "@recipesage/prisma";

export async function validateSession(
  token: string,
): Promise<Session | undefined> {
  const session = await prisma.session.findFirst({
    where: {
      token,
    },
  });

  return session || undefined;
}
