import { prisma, prismaJobSummaryToJobSummary } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { jobSummary } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getSignedDownloadUrl,
  ObjectTypes,
} from "@recipesage/util/server/storage";

export const getJobDownloadUrlById = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/jobs/getJobDownloadUrlById",
      tags: ["jobs"],
      summary: "Get a signed download URL for the result of a job",
      protect: true,
    },
  })
  .input(
    z.object({
      id: z.uuid(),
    }),
  )
  .output(
    z.object({
      signedUrl: z.string(),
    }),
  )
  .query(async ({ input, ctx }) => {
    const session = ctx.session;
    validateTrpcSession(session);

    const _job = await prisma.job.findUniqueOrThrow({
      where: {
        userId: session.userId,
        id: input.id,
      },
      ...jobSummary,
    });

    const job = prismaJobSummaryToJobSummary(_job);

    if (job.type === "IMPORT") {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    let storageKey: string | undefined;
    let fileExtension = "";

    if (job.type === "COOKBOOK") {
      storageKey = job.meta.cookbookStorageKey;
      fileExtension = ".pdf";
    } else if (job.type === "EXPORT") {
      storageKey = job.meta.exportStorageKey;
      switch (job.meta.exportType) {
        case "txt":
          fileExtension = ".txt";
          break;
        case "jsonld":
          fileExtension = ".json";
          break;
        case "pdf":
          fileExtension = ".zip";
          break;
      }
    }

    if (!storageKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Job does not have a storage key",
      });
    }

    const expiresInSeconds = 12 * 60 * 60;
    const signedUrl = await getSignedDownloadUrl(
      ObjectTypes.DATA_EXPORT,
      storageKey,
      {
        expiresInSeconds,
        fileExtension,
      },
    );

    return {
      signedUrl,
    };
  });
