import * as Sentry from "@sentry/node";
import { type MulticastMessage } from "firebase-admin/messaging";
import { prisma } from "@recipesage/prisma";
import { getFirebaseAdmin } from "./firebaseAdmin";

const INVALID_FCM_TOKEN_ERRORS = [
  "messaging/registration-token-not-registered",
];

const FCM_MULTICAST_TOKEN_LIMIT = 500;

const APP_ICON_URL =
  "https://static.recipesage.com/assets/icons/android-chrome-512x512-2025-05-03.png";

export interface FCMNotification {
  title: string;
  body: string;
  tag?: string;
  link?: string;
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildMessage = (
  tokens: string[],
  data: Record<string, string>,
  notification?: FCMNotification,
): MulticastMessage => {
  const message: MulticastMessage = {
    data,
    tokens,
  };

  if (!notification) return message;

  const { title, body, tag, link } = notification;

  message.notification = { title, body };

  message.webpush = {
    notification: {
      title,
      body,
      icon: APP_ICON_URL,
      tag,
    },
    fcmOptions: link ? { link } : undefined,
  };

  message.android = {
    priority: "high",
  };

  message.apns = {
    payload: {
      aps: {
        alert: { title, body },
        sound: "default",
      },
    },
  };

  return message;
};

export const sendFCMMessages = async (
  tokens: string[],
  data: Record<string, string>,
  notification?: FCMNotification,
): Promise<void> => {
  if (!tokens.length) return;

  const admin = await getFirebaseAdmin();
  if (!admin) return;

  const invalidTokens: string[] = [];

  for (const tokenChunk of chunk(tokens, FCM_MULTICAST_TOKEN_LIMIT)) {
    try {
      const response = await admin
        .messaging()
        .sendEachForMulticast(buildMessage(tokenChunk, data, notification));

      response.responses.forEach((sendResponse, index) => {
        if (sendResponse.success) return;

        const code = sendResponse.error?.code;
        if (code && INVALID_FCM_TOKEN_ERRORS.includes(code)) {
          invalidTokens.push(tokenChunk[index]);
        } else if (sendResponse.error) {
          Sentry.captureException(sendResponse.error);
        }
      });
    } catch (e) {
      Sentry.captureException(e);
    }
  }

  if (invalidTokens.length) {
    await prisma.fCMToken.deleteMany({
      where: {
        token: {
          in: invalidTokens,
        },
      },
    });
  }
};
