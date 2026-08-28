import crypto from "node:crypto";
import { z } from "zod";
import appleSignin from "apple-signin-auth";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import { InternalServerError } from "../../errors";
import { config } from "@recipesage/util/server/general";

const schema = {
  query: z.object({
    allowRegistration: z.enum(["true", "false"]).optional(),
    codeChallenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  }),
};

export const redirectAppleInitiateHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const { servicesId, privateKey } = config.apple.signIn;
    if (!servicesId || !privateKey) {
      throw new InternalServerError("Apple Sign In is not configured");
    }

    const allowRegistration = req.query.allowRegistration === "true";

    const redirectUri = `${config.api.publicUrl}/auth/redirect-apple/callback`;

    const statePayload = Buffer.from(
      JSON.stringify({
        ts: Date.now(),
        allowRegistration,
        codeChallenge: req.query.codeChallenge,
      }),
    ).toString("base64url");
    const stateHmac = crypto
      .createHmac("sha256", privateKey)
      .update(statePayload)
      .digest("hex");
    const state = `${statePayload}.${stateHmac}`;

    const authUrl = appleSignin.getAuthorizationUrl({
      clientID: servicesId,
      redirectUri,
      state,
      scope: "name email",
      responseMode: "form_post",
    });

    res.redirect(authUrl);
  },
);
