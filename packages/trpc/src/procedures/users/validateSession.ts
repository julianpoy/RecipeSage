import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";

export const validateSession = authenticatedProcedure
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
  .query(async (): Promise<string> => {
    return "Valid";
  });
