import * as Sentry from "@sentry/node";
import { prisma } from "@recipesage/prisma";
import { getFirebaseAdmin } from "./firebaseAdmin";

const INVALID_FCM_TOKEN_ERRORS = [
  "messaging/registration-token-not-registered",
];

const FCM_MULTICAST_TOKEN_LIMIT = 500;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const sendFCMMessages = async (
  tokens: string[],
  payload: Record<string, string>,
): Promise<void> => {
  if (!tokens.length) return;

  const admin = await getFirebaseAdmin();
  if (!admin) return;

  const invalidTokens: string[] = [];

  for (const tokenChunk of chunk(tokens, FCM_MULTICAST_TOKEN_LIMIT)) {
    try {
      const response = await admin.messaging().sendEachForMulticast({
        data: payload,
        tokens: tokenChunk,
      });

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
