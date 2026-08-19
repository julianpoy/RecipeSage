import { prisma } from "@recipesage/prisma";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";

export const healthHandler = defineHandler(
  {
    schema: {},
    authentication: AuthenticationEnforcement.None,
  },
  async () => {
    const healthy = {
      prisma: false,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      healthy.prisma = true;
    } catch (_e) {
      // Do nothing
    }

    return {
      statusCode: Object.values(healthy).includes(false) ? 500 : 200,
      data: healthy,
    };
  },
);
