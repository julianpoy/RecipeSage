import { prisma } from "@recipesage/prisma";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";

export const healthzHandler = defineHandler(
  {
    schema: {},
    authentication: AuthenticationEnforcement.None,
  },
  async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return {
        statusCode: 200,
        data: "healthy",
      };
    } catch (e) {
      console.error(e);

      return {
        statusCode: 500,
        data: "unhealthy",
      };
    }
  },
);
