import * as Sentry from "@sentry/node";
import appleSignin from "apple-signin-auth";
import { getAppleClientSecret } from "./getAppleClientSecret";

export const revokeAppleAuthTokens = async (
  appleAuthTokens: {
    clientId: string;
    refreshToken: string;
  }[],
): Promise<void> => {
  for (const appleAuthToken of appleAuthTokens) {
    try {
      const result = await appleSignin.revokeAuthorizationToken(
        appleAuthToken.refreshToken,
        {
          clientID: appleAuthToken.clientId,
          clientSecret: getAppleClientSecret(appleAuthToken.clientId),
          tokenTypeHint: "refresh_token",
        },
      );
      if (result?.error) {
        throw new Error(`Apple token revoke failed: ${result.error}`);
      }
    } catch (e) {
      Sentry.captureException(e);
    }
  }
};
