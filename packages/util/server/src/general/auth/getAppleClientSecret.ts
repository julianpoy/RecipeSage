import appleSignin from "apple-signin-auth";
import { config } from "../config";

export const getAppleClientSecret = (clientId: string): string => {
  const { teamId, keyId, privateKey } = config.apple.signIn;
  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple Sign In is not configured");
  }

  return appleSignin.getClientSecret({
    clientID: clientId,
    teamID: teamId,
    keyIdentifier: keyId,
    privateKey,
  });
};
