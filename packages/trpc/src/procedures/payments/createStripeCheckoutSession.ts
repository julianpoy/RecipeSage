import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createOrRetrieveCustomerId,
  createPYOSession,
} from "@recipesage/util/server/capabilities";

export const createStripeCheckoutSession = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/payments/createStripeCheckoutSession",
      tags: ["payments"],
      summary:
        "Create a Stripe checkout session for a one-time or recurring payment",
    },
  })
  .input(
    z.object({
      frequency: z.enum(["monthly", "yearly", "single"]).optional(), // Backwards compat - field marked as optional
      isRecurring: z.boolean().optional(), // Backwards compat - field still included, can be removed
      amount: z.number().min(0).max(1000000),
      successUrl: z.string(),
      cancelUrl: z.string(),
    }),
  )
  .output(
    z.object({
      id: z.string(),
      url: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    let frequency = input.frequency;
    // Backwards compat
    if (!frequency) {
      frequency = input.isRecurring ? "monthly" : "single";
    }

    if (process.env.NODE_ENV === "selfhost") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Selfhost cannot use payments",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !input.successUrl.match(/https:\/\/(.*\.)?recipesage\.com(\/.*)?$/)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Provided successUrl is not allowed",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !input.cancelUrl.match(/https:\/\/(.*\.)?recipesage\.com(\/.*)?$/)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Provided cancelUrl is not allowed",
      });
    }

    if (input.frequency === "monthly" && input.amount < 100) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Minimum is $1 due to transaction fees, sorry!",
      });
    }
    if (input.frequency === "yearly" && input.amount < 1000) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Minimum is $10 due to transaction fees, sorry!",
      });
    }
    if (input.frequency === "single" && input.amount < 1000) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Minimum is $10 due to transaction fees, sorry!",
      });
    }

    let stripeCustomerId;
    if (session) {
      stripeCustomerId = await createOrRetrieveCustomerId(session.userId);
    }

    const stripeSession = await createPYOSession({
      frequency,
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
