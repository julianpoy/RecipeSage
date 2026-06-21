import { prisma } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const logout = authenticatedProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/logout",
      tags: ["users"],
      summary: "Invalidate the caller's current session",
      protect: true,
    },
  })
  .output(z.string())
  .mutation(async ({ ctx }): Promise<string> => {
    await prisma.session.deleteMany({
      where: {
        token: ctx.session.token,
      },
    });

    return "Ok";
  });
