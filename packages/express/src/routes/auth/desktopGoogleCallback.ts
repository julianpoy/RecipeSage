import crypto from "node:crypto";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import { BadRequestError, InternalServerError } from "../../errors";
import { config } from "@recipesage/util/server/general";

const schema = {
  query: z.object({
    code: z.string(),
    state: z.string(),
  }),
};

const stateSchema = z.object({
  ts: z.number(),
  allowRegistration: z.boolean(),
});

const STATE_VALIDITY_MS = 10 * 60 * 1000;
const AUTH_CODE_VALIDITY_MS = 60 * 1000;

export const desktopGoogleCallbackHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const { clientId, clientSecret } = config.google.gsi;
    if (!clientId || !clientSecret) {
      throw new InternalServerError("Google OAuth is not configured");
    }

    const { code, state } = req.query;

    const parts = state.split(".");
    if (parts.length !== 2) {
      throw new BadRequestError("Invalid state parameter");
    }
    const [statePayload, stateHmac] = parts;
    if (!/^[0-9a-f]{64}$/.test(stateHmac)) {
      throw new BadRequestError("Invalid state parameter");
    }
    const expectedStateHmac = crypto
      .createHmac("sha256", clientSecret)
      .update(statePayload)
      .digest("hex");
    if (
      !crypto.timingSafeEqual(
        Buffer.from(stateHmac, "hex"),
        Buffer.from(expectedStateHmac, "hex"),
      )
    ) {
      throw new BadRequestError("Invalid state signature");
    }

    let parsedState: z.infer<typeof stateSchema>;
    try {
      parsedState = stateSchema.parse(
        JSON.parse(Buffer.from(statePayload, "base64url").toString("utf-8")),
      );
    } catch {
      throw new BadRequestError("Invalid state payload");
    }

    const age = Date.now() - parsedState.ts;
    if (Number.isNaN(age) || age > STATE_VALIDITY_MS) {
      throw new BadRequestError("State expired");
    }

    const redirectUri = `${config.api.publicUrl}/auth/desktop-google/callback`;
    const client = new OAuth2Client(clientId, clientSecret, redirectUri);

    let idToken: string;
    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) {
        throw new BadRequestError("No ID token received from Google");
      }
      idToken = tokens.id_token;
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError("Failed to exchange authorization code");
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new BadRequestError("No email in token payload");
    }

    const authCodePayload = Buffer.from(
      JSON.stringify({
        email: payload.email,
        name: payload.name || payload.email,
        allowRegistration: parsedState.allowRegistration,
        exp: Date.now() + AUTH_CODE_VALIDITY_MS,
      }),
    ).toString("base64url");
    const authCodeHmac = crypto
      .createHmac("sha256", clientSecret)
      .update(authCodePayload)
      .digest("hex");
    const authCode = `${authCodePayload}.${authCodeHmac}`;

    const protocolUrl = new URL("recipesage://auth");
    protocolUrl.searchParams.set("code", authCode);

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>RecipeSage</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;color:#333;">
<p>Redirecting to RecipeSage Desktop... You can close this tab.</p>
<script>window.location.href=${JSON.stringify(protocolUrl.toString())};</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  },
);
