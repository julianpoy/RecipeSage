import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createOrRetrieveCustomerId,
  createPYOSession,
} from "@recipesage/util/server/capabilities";

const ALLOWED_REDIRECT_HOSTNAME = "recipesage.com";

const isAllowedRedirectUrl = (value: string) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    (url.hostname === ALLOWED_REDIRECT_HOSTNAME ||
      url.hostname.endsWith(`.${ALLOWED_REDIRECT_HOSTNAME}`))
  );
};

export const createStripeCheckoutSession = publicProcedure
  .input(
    z.object({
      frequency: z.enum(["monthly", "yearly", "single"]),
      amount: z.number().min(0).max(1000000),
      successUrl: z.string(),
      cancelUrl: z.string(),
      currency: z.string().default("usd"),
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

    if (process.env.NODE_ENV === "selfhost") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Selfhost cannot use payments",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !isAllowedRedirectUrl(input.successUrl)
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Provided successUrl is not allowed",
      });
    }

    if (
      process.env.NODE_ENV !== "development" &&
      !isAllowedRedirectUrl(input.cancelUrl)
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
      frequency: input.frequency,
      stripeCustomerId,
      amount: input.amount,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      currency: input.currency,
    });

    return {
      id: stripeSession.id,
      url: stripeSession.url,
    };
  });
