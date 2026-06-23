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
} from "@recipesage/util/server/general";

const authCodePayloadSchema = z.object({
  email: z.string(),
  name: z.string(),
  allowRegistration: z.boolean(),
  exp: z.number(),
});

export const signInWithDesktopGoogle = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/users/signInWithDesktopGoogle",
      tags: ["users"],
      summary: "Exchange a desktop Google auth code for a session token",
    },
  })
  .input(
    z.object({
      code: z.string(),
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
      .update(payloadB64)
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
