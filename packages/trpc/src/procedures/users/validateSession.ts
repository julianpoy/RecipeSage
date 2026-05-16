import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";

export const validateSession = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/validateSession",
      tags: ["users"],
      summary: "Validate the caller's bearer token",
      protect: true,
    },
  })
  .output(z.string())
  .query(async ({ ctx }): Promise<string> => {
    const session = ctx.session;
    validateTrpcSession(session);

    return "Valid";
  });
