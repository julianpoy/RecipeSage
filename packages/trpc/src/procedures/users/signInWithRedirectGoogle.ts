import { prisma, SessionDTO, sessionDTOSchema } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { z } from "zod";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
  SessionType,
  generateSession,
  config,
  metrics,
  REDIRECT_GOOGLE_AUTH_CODE_HMAC_PREFIX,
} from "@recipesage/util/server/general";

const authCodePayloadSchema = z.object({
  email: z.string(),
  name: z.string(),
  allowRegistration: z.boolean(),
  codeChallenge: z.string(),
  exp: z.number(),
});

export const signInWithRedirectGoogle = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/signInWithRedirectGoogle",
      tags: ["users"],
      summary: "Exchange an redirect Google auth code for a session token",
      description:
        "Requires no session token. Requires the PKCE code verifier that matches the challenge bound to the auth code. Responds 401 if the supplied auth code has an invalid signature, has expired, or the verifier does not match.",
      protect: false,
      errorResponses: {
        400: "Invalid input data",
        401: "The auth code signature is invalid, the auth code has expired, or the PKCE verifier does not match",
        500: "Internal server error",
      },
    },
  })
  .input(
    z.object({
      code: z.string(),
      codeVerifier: z.string(),
    }),
  )
  .output(sessionDTOSchema)
  .mutation(async ({ input }) => {
    const secret = config.google.gsi.clientSecret;
    if (!secret) {
      throw new TRPCError({
        message: "Google OAuth is not configured",
        code: "INTERNAL_SERVER_ERROR",
      });
    }

    const parts = input.code.split(".");
    if (parts.length !== 2) {
      throw new TRPCError({
        message: "Invalid auth code format",
        code: "BAD_REQUEST",
      });
    }
    const [payloadB64, hmac] = parts;

    if (!/^[0-9a-f]{64}$/.test(hmac)) {
      throw new TRPCError({
        message: "Invalid auth code format",
        code: "BAD_REQUEST",
      });
    }

    const expectedHmac = crypto
      .createHmac("sha256", secret)
      .update(REDIRECT_GOOGLE_AUTH_CODE_HMAC_PREFIX + payloadB64)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(hmac, "hex"),
        Buffer.from(expectedHmac, "hex"),
      )
    ) {
      throw new TRPCError({
        message: "Invalid auth code signature",
        code: "UNAUTHORIZED",
      });
    }

    let rawPayload: unknown;
    try {
      rawPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8"),
      );
    } catch {
      throw new TRPCError({
        message: "Invalid auth code payload",
        code: "BAD_REQUEST",
      });
    }

    const parsedPayload = authCodePayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      throw new TRPCError({
        message: "Invalid auth code payload",
        code: "BAD_REQUEST",
      });
    }
    const payload = parsedPayload.data;

    if (Date.now() > payload.exp) {
      throw new TRPCError({
        message: "Auth code has expired",
        code: "UNAUTHORIZED",
      });
    }

    const computedChallenge = crypto
      .createHash("sha256")
      .update(input.codeVerifier)
      .digest("base64url");
    const expectedChallenge = Buffer.from(payload.codeChallenge);
    const actualChallenge = Buffer.from(computedChallenge);

    if (
      expectedChallenge.length !== actualChallenge.length ||
      !crypto.timingSafeEqual(expectedChallenge, actualChallenge)
    ) {
      throw new TRPCError({
        message: "Invalid PKCE verifier",
        code: "UNAUTHORIZED",
      });
    }

    const email = payload.email.toLowerCase();

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (!existingUser && !payload.allowRegistration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "An account with that email address was not found",
      });
    }

    const user = await prisma.user.upsert({
      where: {
        email,
      },
      create: {
        name: payload.name,
        email,
      },
      update: {
        lastLogin: new Date(),
      },
    });

    const session = await generateSession(user.id, SessionType.User);

    if (existingUser) {
      metrics.userLogin.inc({
        auth_type: "google",
      });
    } else {
      metrics.userCreated.inc({
        auth_type: "google",
      });
    }

    return {
      token: session.token,
      userId: session.userId,
      email: user.email,
    } satisfies SessionDTO;
  });
