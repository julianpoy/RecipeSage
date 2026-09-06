import * as Sentry from "@sentry/node";
import {
  Prisma,
  prisma,
  type PrismaTransactionClient,
} from "@recipesage/prisma";
import {
  acknowledgeGoogleSubscription,
  applyGoogleSubscriptions,
  getGoogleSubscription,
  resolveGoogleSubscriptionOwner,
  resolveGoogleSubscriptions,
  revokeStoreSubscription,
  StoreTransactionOwnershipError,
  SubscriptionPlatform,
  suspendStoreSubscription,
} from "@recipesage/util/server/capabilities";
import { config } from "@recipesage/util/server/general";
import { z } from "zod";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import { InternalServerError, UnauthorizedError } from "../../errors";

const GOOGLE_SUBSCRIPTION_REVOKED = 12;
const SUSPENDED_STATES = new Set([
  "SUBSCRIPTION_STATE_ON_HOLD",
  "SUBSCRIPTION_STATE_PAUSED",
]);

const schema = {
  query: z.object({
    token: z.string().optional(),
  }),
  body: z.object({
    message: z.object({
      data: z.string(),
      messageId: z.string(),
    }),
    subscription: z.string().optional(),
  }),
};

const developerNotificationSchema = z.object({
  eventTimeMillis: z.union([z.string(), z.number()]).optional(),
  packageName: z.string().optional(),
  subscriptionNotification: z
    .object({
      notificationType: z.number().optional(),
      purchaseToken: z.string(),
    })
    .optional(),
  voidedPurchaseNotification: z
    .object({
      purchaseToken: z.string(),
      orderId: z.string(),
      productType: z.number(),
      refundType: z.number().optional(),
    })
    .optional(),
  pendingRefundReviewNotification: z
    .object({
      pendingRefundToken: z.string(),
      orderId: z.string(),
      refundReason: z.number(),
      obfuscatedAccountId: z.string().optional(),
      obfuscatedProfileId: z.string().optional(),
    })
    .optional(),
  testNotification: z.object({}).optional(),
});

const recordNotification = (
  externalId: string,
  payload: string,
  userId?: string,
  tx: PrismaTransactionClient = prisma,
) =>
  tx.storeNotificationEvent.create({
    data: {
      platform: SubscriptionPlatform.Google,
      externalId,
      userId,
      blob: { payload },
    },
  });

const processGoogleNotification = async (
  notification: z.infer<typeof developerNotificationSchema>,
  messageId: string,
  payload: string,
) => {
  const pendingRefund = notification.pendingRefundReviewNotification;
  if (pendingRefund) {
    await recordNotification(messageId, payload);
    Sentry.captureMessage("Google pending refund review received", {
      extra: pendingRefund,
    });
    return { statusCode: 200, data: "Ok" };
  }

  const purchaseToken =
    notification.subscriptionNotification?.purchaseToken ??
    notification.voidedPurchaseNotification?.purchaseToken;
  if (notification.testNotification || !purchaseToken) {
    await recordNotification(messageId, payload);
    return { statusCode: 200, data: "Ok" };
  }

  const shouldRevoke =
    notification.subscriptionNotification?.notificationType ===
      GOOGLE_SUBSCRIPTION_REVOKED ||
    notification.voidedPurchaseNotification?.productType === 1;
  if (shouldRevoke) {
    await prisma.$transaction(async (tx) => {
      const revoked = await revokeStoreSubscription(
        SubscriptionPlatform.Google,
        purchaseToken,
        tx,
      );
      await recordNotification(messageId, payload, revoked.userId, tx);
    });
    return { statusCode: 200, data: "Ok" };
  }

  let subscription;
  try {
    subscription = await getGoogleSubscription(purchaseToken);
  } catch (err) {
    Sentry.captureException(err);
    throw new InternalServerError("Could not fetch subscription state");
  }

  const userId = await resolveGoogleSubscriptionOwner(
    purchaseToken,
    subscription,
  );
  if (!userId) {
    await recordNotification(messageId, payload);
    Sentry.captureMessage("Google notification for unknown user", {
      extra: { purchaseToken },
    });
    return { statusCode: 200, data: "Ok" };
  }

  if (SUSPENDED_STATES.has(subscription.subscriptionState ?? "")) {
    await prisma.$transaction(async (tx) => {
      await suspendStoreSubscription(
        SubscriptionPlatform.Google,
        purchaseToken,
        tx,
      );
      await recordNotification(messageId, payload, userId, tx);
    });
    return { statusCode: 200, data: "Ok" };
  }

  const subscriptions = resolveGoogleSubscriptions(subscription);
  if (subscriptions.length === 0) {
    await recordNotification(messageId, payload, userId);
    return { statusCode: 200, data: "Ok" };
  }

  try {
    await prisma.$transaction((tx) =>
      applyGoogleSubscriptions(
        userId,
        purchaseToken,
        subscriptions,
        subscription.linkedPurchaseToken,
        tx,
      ),
    );
  } catch (err) {
    if (err instanceof StoreTransactionOwnershipError) {
      await recordNotification(messageId, payload, userId);
      Sentry.captureMessage("Google transaction ownership conflict", {
        extra: { purchaseToken, userId },
      });
      return { statusCode: 200, data: "Ok" };
    }
    throw err;
  }

  if (subscription.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
    try {
      await acknowledgeGoogleSubscription(purchaseToken);
    } catch (err) {
      Sentry.captureException(err);
      throw new InternalServerError("Could not acknowledge subscription");
    }
  }

  await recordNotification(messageId, payload, userId);
  return { statusCode: 200, data: "Ok" };
};

export const googleNotificationsHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw new InternalServerError("Selfhost cannot use payments");
    }
    if (req.query.token !== config.google.iap.pubsubVerificationToken) {
      throw new UnauthorizedError("Invalid verification token");
    }

    const { data, messageId } = req.body.message;
    const existing = await prisma.storeNotificationEvent.findUnique({
      where: {
        platform_externalId: {
          platform: SubscriptionPlatform.Google,
          externalId: messageId,
        },
      },
    });
    if (existing) {
      return { statusCode: 200, data: "Already handled" };
    }

    const payload = Buffer.from(data, "base64").toString("utf8");
    let notification;
    try {
      notification = developerNotificationSchema.parse(JSON.parse(payload));
    } catch (err) {
      Sentry.captureException(err);
      await recordNotification(messageId, payload);
      return { statusCode: 200, data: "Ok" };
    }

    try {
      return await processGoogleNotification(notification, messageId, payload);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { statusCode: 200, data: "Already handled" };
      }
      throw err;
    }
  },
);
