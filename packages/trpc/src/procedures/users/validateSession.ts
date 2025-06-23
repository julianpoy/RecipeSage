import { publicProcedure } from "../../trpc";
import { validateTrpcSession } from "@recipesage/util/server/general";

export const validateSession = publicProcedure.query(
  async ({ ctx }): Promise<string> => {
    const session = ctx.session;
    validateTrpcSession(session);

    return "Valid";
  },
);
