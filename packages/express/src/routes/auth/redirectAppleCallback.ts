import crypto from "node:crypto";
import { z } from "zod";
import appleSignin from "apple-signin-auth";
import { AuthenticationEnforcement } from "../../authenticationEnforcement";
import { defineHandler } from "../../defineHandler";
import { BadRequestError, InternalServerError } from "../../errors";
import {
  config,
  REDIRECT_APPLE_AUTH_CODE_HMAC_PREFIX,
} from "@recipesage/util/server/general";

const schema = {
  body: z.object({
    code: z.string().optional(),
    state: z.string().optional(),
    user: z.string().optional(),
    error: z.string().optional(),
  }),
};

const stateSchema = z.object({
  ts: z.number(),
  allowRegistration: z.boolean(),
  codeChallenge: z.string(),
});

const appleUserSchema = z.object({
  name: z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    })
    .optional(),
});

const STATE_VALIDITY_MS = 10 * 60 * 1000;
const AUTH_CODE_VALIDITY_MS = 60 * 1000;

export const redirectAppleCallbackHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const { servicesId, teamId, keyId, privateKey } = config.apple.signIn;
    if (!servicesId || !teamId || !keyId || !privateKey) {
      throw new InternalServerError("Apple Sign In is not configured");
    }

    const { code, state, user, error } = req.body;

    if (error || !code || !state) {
      throw new BadRequestError("Apple sign in did not complete");
    }

    const parts = state.split(".");
    if (parts.length !== 2) {
      throw new BadRequestError("Invalid state parameter");
    }
    const [statePayload, stateHmac] = parts;
    if (!/^[0-9a-f]{64}$/.test(stateHmac)) {
      throw new BadRequestError("Invalid state parameter");
    }
    const expectedStateHmac = crypto
      .createHmac("sha256", privateKey)
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

    const redirectUri = `${config.api.publicUrl}/auth/redirect-apple/callback`;

    let idToken: string;
    try {
      const clientSecret = appleSignin.getClientSecret({
        clientID: servicesId,
        teamID: teamId,
        keyIdentifier: keyId,
        privateKey,
      });

      const tokens = await appleSignin.getAuthorizationToken(code, {
        clientID: servicesId,
        redirectUri,
        clientSecret,
      });
      if (!tokens.id_token) {
        throw new BadRequestError("No ID token received from Apple");
      }
      idToken = tokens.id_token;
    } catch (e) {
      if (e instanceof BadRequestError) throw e;
      throw new BadRequestError("Failed to exchange authorization code");
    }

    const payload = await appleSignin.verifyIdToken(idToken, {
      audience: servicesId,
    });
    const email = payload.email;
    const emailVerified =
      payload.email_verified === true || payload.email_verified === "true";
    if (!email || !emailVerified) {
      throw new BadRequestError("No verified email in token payload");
    }

    let name = email;
    if (user) {
      try {
        const parsedUser = appleUserSchema.parse(JSON.parse(user));
        const fullName = [parsedUser.name?.firstName, parsedUser.name?.lastName]
          .filter((part): part is string => !!part)
          .join(" ");
        if (fullName) name = fullName;
      } catch {
        // Ignore malformed user payloads and fall back to the email
      }
    }

    const authCodePayload = Buffer.from(
      JSON.stringify({
        email,
        name,
        allowRegistration: parsedState.allowRegistration,
        codeChallenge: parsedState.codeChallenge,
        exp: Date.now() + AUTH_CODE_VALIDITY_MS,
      }),
    ).toString("base64url");
    const authCodeHmac = crypto
      .createHmac("sha256", privateKey)
      .update(`${REDIRECT_APPLE_AUTH_CODE_HMAC_PREFIX}${authCodePayload}`)
      .digest("hex");
    const authCode = `${authCodePayload}.${authCodeHmac}`;

    const protocolUrl = new URL("recipesage://auth");
    protocolUrl.searchParams.set("code", authCode);

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>RecipeSage</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;color:#333;">
<p>Redirecting to RecipeSage... You can close this tab.</p>
<script>window.location.href=${JSON.stringify(protocolUrl.toString())};</script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  },
);
