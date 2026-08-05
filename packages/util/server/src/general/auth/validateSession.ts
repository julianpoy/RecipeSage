import { Session } from "@recipesage/prisma";
import { prisma } from "@recipesage/prisma";

export async function validateSession(
  token: string,
): Promise<Session | undefined> {
  const session = await prisma.session.findUnique({
    where: {
      token,
    },
  });

  if (!session || session.expires < new Date()) return undefined;

  return session;
}
