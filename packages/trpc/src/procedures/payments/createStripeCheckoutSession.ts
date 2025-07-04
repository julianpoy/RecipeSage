import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createOrRetrieveCustomerId,
  createPYOSession,
} from "@recipesage/util/server/capabilities";

export const createStripeCheckoutSession = publicProcedure
  .input(
    z.object({
      isRecurring: z.boolean(),
      amount: z.number().min(0).max(1000000),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;

    if (process.env.NODE_ENV === "selfhost") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Selfhost cannot use payments",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !input.successUrl.match(/https:\/\/(beta\.)?recipesage\.com(\/.*)?$/)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Provided successUrl is not allowed",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !input.cancelUrl.match(/https:\/\/(beta\.)?recipesage\.com(\/.*)?$/)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Provided cancelUrl is not allowed",
      });
    }

    if (input.isRecurring && input.amount < 100) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Minimum is $1 due to transaction fees, sorry!",
      });
    }
    if (!input.isRecurring && input.amount < 500) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Minimum is $5 due to transaction fees, sorry!",
      });
    }

    let stripeCustomerId;
    if (session) {
      stripeCustomerId = await createOrRetrieveCustomerId(session.userId);
    }

    const stripeSession = await createPYOSession({
      isRecurring: input.isRecurring,
      stripeCustomerId,
      amount: input.amount,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return {
      id: stripeSession.id,
      url: stripeSession.url,
    };
  });
