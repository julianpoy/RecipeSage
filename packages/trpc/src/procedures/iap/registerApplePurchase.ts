import { authenticatedProcedure } from "../../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@recipesage/prisma";
import {
  getAppleTransactionById,
  grantStoreSubscription,
  resolveAppleSubscription,
  SubscriptionPlatform,
  verifyAppleTransaction,
} from "@recipesage/util/server/capabilities";

export const registerApplePurchase = authenticatedProcedure
  .input(
    z.object({
      jwsRepresentation: z.string().optional(),
      transactionId: z.string().optional(),
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

    let transaction;
    if (input.jwsRepresentation) {
      try {
        transaction = await verifyAppleTransaction(input.jwsRepresentation);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not verify the provided transaction",
        });
      }
    } else if (input.transactionId) {
      try {
        transaction = await getAppleTransactionById(input.transactionId);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not verify the provided transaction",
        });
      }
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Must provide jwsRepresentation or transactionId",
      });
    }

    if (transaction.appAccountToken !== ctx.session.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Transaction does not belong to this account",
      });
    }

    const subscription = resolveAppleSubscription(transaction);
    if (!subscription) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Transaction is not an active recognized subscription",
      });
    }

    const result = await prisma.$transaction((tx) =>
      grantStoreSubscription(
        ctx.session.userId,
        subscription.name,
        SubscriptionPlatform.Apple,
        subscription.externalId,
        subscription.expires,
        tx,
      ),
    );

    if (!result) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Transaction cannot be registered to this account",
      });
    }

    return {
      granted: Boolean(result.expires && result.expires.getTime() > Date.now()),
      expires: result.expires ? result.expires.toISOString() : null,
    };
  });
