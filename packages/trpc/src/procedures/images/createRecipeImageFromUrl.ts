import { imageSummary, imageSummarySchema, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { publicProcedure } from "../../trpc";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import {
  FileTransformError,
  validateTrpcSession,
} from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { ObjectTypes, writeImageURL } from "@recipesage/util/server/storage";

export const createRecipeImageFromUrl = publicProcedure
  .meta({
    openapi: {
      method: "POST",
      path: "/images/createRecipeImageFromUrl",
      tags: ["images"],
      summary: "Download an image from a URL and store it as a recipe image",
      protect: true,
    },
  })
  .input(
    z.object({
      url: z.string().min(1).max(4096),
    }),
  )
  .output(imageSummarySchema)
  .mutation(async ({ ctx, input }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const encodeInHighRes = await userHasCapability(
      session.userId,
      Capabilities.HighResImages,
    );

    let storedFile;
    try {
      storedFile = await writeImageURL(
        ObjectTypes.RECIPE_IMAGE,
        input.url,
        encodeInHighRes,
      );
    } catch (e) {
      if (!(e instanceof FileTransformError)) {
        Sentry.captureException(e);
      }
      throw new TRPCError({
        message: "Unsupported media type",
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    }

    const image = await prisma.image.create({
      data: {
        userId: session.userId,
        location: storedFile.location,
        key: storedFile.key,
        json: storedFile as unknown as InputJsonValue,
      },
      ...imageSummary,
    });

    return image;
  });
