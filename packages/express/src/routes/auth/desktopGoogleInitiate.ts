import crypto from "node:crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { InternalServerError } from "../../errors";
import { config } from "@recipesage/util/server/general";

const schema = {
  query: z.object({
    allowRegistration: z.enum(["true", "false"]).optional(),
  }),
};

export const desktopGoogleInitiateHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const { clientId, clientSecret } = config.google.gsi;
    if (!clientId || !clientSecret) {
      throw new InternalServerError("Google OAuth is not configured");
    }

    const allowRegistration = req.query.allowRegistration === "true";

    const redirectUri = `${config.api.publicUrl}/auth/desktop-google/callback`;
    const client = new OAuth2Client(clientId, clientSecret, redirectUri);

    const statePayload = Buffer.from(
      JSON.stringify({ ts: Date.now(), allowRegistration }),
    ).toString("base64url");
    const stateHmac = crypto
      .createHmac("sha256", clientSecret)
      .update(statePayload)
      .digest("hex");
    const state = `${statePayload}.${stateHmac}`;

    const authUrl = client.generateAuthUrl({
      scope: ["email", "profile", "openid"],
      state,
      access_type: "online",
    });

    res.redirect(authUrl);
  },
);
