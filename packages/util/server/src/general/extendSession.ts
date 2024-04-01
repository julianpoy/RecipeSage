import { Session } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";

const SESSION_VALIDITY_LENGTH = 30; // Initial session validity time
const RENEW_WHEN_EXPIRES_WITHIN_DAYS = 29; // If session expires within this many days, we extend the session

export async function extendSession(session: Session) {
  // We will not extend sessions that are already expired
  if (session.expires < new Date()) {
    return;
  }

  // Extend the session expiry only if necessary
  const graceDate = new Date();
  graceDate.setDate(graceDate.getDate() + RENEW_WHEN_EXPIRES_WITHIN_DAYS);

  if (session.expires < graceDate) {
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + SESSION_VALIDITY_LENGTH);

    prisma.session
      .update({
        where: {
          id: session.id,
        },
        data: {
          expires: newExpiry,
        },
      })
      .catch((err) => {
        Sentry.captureException(err);
      });
  }
}
