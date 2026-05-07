import { publicProcedure } from "../../trpc";
import {
  dailyCreditUsageSchema,
  getDailyCreditUsage,
  validateTrpcSession,
} from "@recipesage/util/server/general";

export const getMyCreditUsage = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMyCreditUsage",
      tags: ["users"],
      summary: "Get the caller's daily credit usage",
      protect: true,
    },
  })
  .output(dailyCreditUsageSchema)
  .query(async ({ ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    return getDailyCreditUsage(session.userId);
  });
