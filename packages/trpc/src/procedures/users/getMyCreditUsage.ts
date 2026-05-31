import { authenticatedProcedure } from "../../trpc";
import {
  dailyCreditUsageSchema,
  getDailyCreditUsage,
} from "@recipesage/util/server/general";

export const getMyCreditUsage = authenticatedProcedure
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
    return getDailyCreditUsage(ctx.session.userId);
  });
