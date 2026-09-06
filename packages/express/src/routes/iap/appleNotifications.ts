import * as Sentry from "@sentry/node";
import { NotificationTypeV2 } from "@apple/app-store-server-library";
import { Prisma, prisma } from "@recipesage/prisma";
import {
  grantStoreSubscription,
  resolveAppleSubscription,
  resolveAppleSubscriptionOwner,
  revokeStoreSubscription,
  SubscriptionPlatform,
  verifyAppleNotification,
  verifyAppleTransaction,
} from "@recipesage/util/server/capabilities";
import { z } from "zod";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import { BadRequestError, InternalServerError } from "../../errors";

const schema = {
  body: z.object({
    signedPayload: z.string(),
  }),
};

const decodeNotification = async (signedPayload: string) => {
  try {
    return await verifyAppleNotification(signedPayload);
  } catch (err) {
    Sentry.captureException(err);
    throw new BadRequestError();
  }
};

const decodeTransaction = async (signedTransactionInfo?: string) => {
  if (!signedTransactionInfo) {
    return undefined;
  }

  try {
    return await verifyAppleTransaction(signedTransactionInfo);
  } catch (err) {
    Sentry.captureException(err);
    throw new BadRequestError();
  }
};

export const appleNotificationsHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req) => {
    if (process.env.NODE_ENV === "selfhost") {
      throw new InternalServerError("Selfhost cannot use payments");
    }

    const payload = await decodeNotification(req.body.signedPayload);
    const notificationUUID = payload.notificationUUID;
    if (!notificationUUID) {
      throw new BadRequestError();
    }

    const transaction = await decodeTransaction(
      payload.data?.signedTransactionInfo,
    );
    const userId = transaction
      ? await resolveAppleSubscriptionOwner(transaction)
      : undefined;
    const subscription = transaction
      ? resolveAppleSubscription(transaction)
      : undefined;
    const shouldRevoke =
      payload.notificationType === NotificationTypeV2.REFUND ||
      payload.notificationType === NotificationTypeV2.REVOKE;
    const shouldGrant =
      payload.notificationType === NotificationTypeV2.SUBSCRIBED ||
      payload.notificationType === NotificationTypeV2.DID_RENEW;
    const transactionIsCurrent = Boolean(
      transaction?.expiresDate && transaction.expiresDate > Date.now(),
    );

    try {
      const hasOwnershipConflict = await prisma.$transaction(async (tx) => {
        let eventUserId = userId;
        let ownershipConflict = false;

        if (shouldRevoke) {
          if (transaction?.transactionId && transactionIsCurrent) {
            const revoked = await revokeStoreSubscription(
              SubscriptionPlatform.Apple,
              transaction.transactionId,
              tx,
            );
            eventUserId = eventUserId ?? revoked.userId;
          }
        } else if (shouldGrant && userId && subscription) {
          const granted = await grantStoreSubscription(
            userId,
            subscription.name,
            SubscriptionPlatform.Apple,
            subscription.externalId,
            subscription.expires,
            tx,
          );
          if (!granted) {
            ownershipConflict = true;
          }
        }

        await tx.storeNotificationEvent.create({
          data: {
            platform: SubscriptionPlatform.Apple,
            externalId: notificationUUID,
            userId: eventUserId,
            blob: { signedPayload: req.body.signedPayload },
          },
        });

        return ownershipConflict;
      });

      if (subscription && !userId) {
        Sentry.captureMessage("Apple notification for unknown user", {
          extra: { transactionId: transaction?.transactionId },
        });
      } else if (hasOwnershipConflict) {
        Sentry.captureMessage("Apple transaction ownership conflict", {
          extra: { transactionId: transaction?.transactionId, userId },
        });
      }
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return { statusCode: 200, data: "Already handled" };
      }
      throw err;
    }

    return { statusCode: 200, data: "Ok" };
  },
);
