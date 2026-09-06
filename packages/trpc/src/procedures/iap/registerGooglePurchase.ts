import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@recipesage/prisma";
import {
  acknowledgeGoogleSubscription,
  applyGoogleSubscriptions,
  getGoogleSubscription,
  resolveGoogleSubscriptionOwner,
  resolveGoogleSubscriptions,
  StoreTransactionOwnershipError,
} from "@recipesage/util/server/capabilities";

export const registerGooglePurchase = authenticatedProcedure
  .input(
    z.object({
      purchaseToken: z.string(),
    }),
  )
  .output(
    z.object({
      granted: z.boolean(),
      expires: z.string().nullable(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Selfhost cannot use payments",
      });
    }

    let subscription;
    try {
      subscription = await getGoogleSubscription(input.purchaseToken);
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not verify the provided purchase",
      });
    }

    const ownerId = await resolveGoogleSubscriptionOwner(
      input.purchaseToken,
      subscription,
    );
    if (ownerId !== ctx.session.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Purchase does not belong to this account",
      });
    }

    const subscriptions = resolveGoogleSubscriptions(subscription);
    if (subscriptions.length === 0) {
      return {
        granted: false,
        expires: null,
      };
    }

    let expires: Date | null;
    try {
      expires = await prisma.$transaction((tx) =>
        applyGoogleSubscriptions(
          ctx.session.userId,
          input.purchaseToken,
          subscriptions,
          subscription.linkedPurchaseToken,
          tx,
        ),
      );
    } catch (err) {
      if (err instanceof StoreTransactionOwnershipError) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Purchase cannot be registered to this account",
        });
      }
      throw err;
    }

    if (subscription.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      try {
        await acknowledgeGoogleSubscription(input.purchaseToken);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not acknowledge the purchase",
        });
      }
    }

    return {
      granted: Boolean(expires && expires.getTime() > Date.now()),
      expires: expires ? expires.toISOString() : null,
    };
  });
