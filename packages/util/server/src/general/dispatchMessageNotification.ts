import * as Sentry from "@sentry/node";
import type { MessageSummary } from "@recipesage/prisma";
import { broadcastWSEventIgnoringErrors, WSBroadcastEventType } from "./grip";
import { sendFCMMessages } from "./firebase";

const MESSAGE_BODY_NOTIFICATION_LIMIT = 500;

const WEB_ORIGIN = process.env.APP_UI_BASE_URL || "https://recipesage.com";

interface MessageNotificationUser {
  id: string;
  name: string;
  handle: string | null;
}

export const dispatchMessageNotification = async (
  recipient: MessageNotificationUser & {
    fcmTokens: string[];
  },
  sender: MessageNotificationUser,
  message: MessageSummary,
): Promise<void> => {
  try {
    const recipe = message.recipe;
    const payload = {
      id: message.id,
      body: message.body.substring(0, MESSAGE_BODY_NOTIFICATION_LIMIT),
      otherUser: sender,
      fromUser: sender,
      toUser: {
        id: recipient.id,
        name: recipient.name,
        handle: recipient.handle,
      },
      ...(recipe
        ? {
            recipe: {
              id: recipe.id,
              title: recipe.title,
              images: recipe.recipeImages.map((recipeImage) => ({
                location: recipeImage.image.location,
              })),
            },
          }
        : {}),
    };

    const sendQueue: Promise<unknown>[] = [];

    if (recipient.fcmTokens.length > 0) {
      sendQueue.push(
        sendFCMMessages(
          recipient.fcmTokens,
          {
            type: WSBroadcastEventType.MessageReceived,
            message: JSON.stringify(payload),
            otherUserId: sender.id,
          },
          {
            title: sender.name,
            body: recipe ? recipe.title : payload.body,
            tag: `${WSBroadcastEventType.MessageReceived}-${sender.id}`,
            link: `${WEB_ORIGIN}/app/messages/${sender.id}`,
          },
        ),
      );
    }

    sendQueue.push(
      broadcastWSEventIgnoringErrors(
        recipient.id,
        WSBroadcastEventType.MessageReceived,
        payload,
      ),
    );

    await Promise.all(sendQueue);
  } catch (e) {
    Sentry.captureException(e);
  }
};
