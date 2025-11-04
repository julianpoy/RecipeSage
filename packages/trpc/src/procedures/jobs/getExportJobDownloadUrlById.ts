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

export const getExportJobDownloadUrlById = publicProcedure
  .input(
    z.object({
      id: z.string().uuid(),
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

    if (!_job || _job.type !== "EXPORT") {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    const job = prismaJobSummaryToJobSummary(_job);

    // Legacy job support
    if (!job.meta?.exportStorageKey && job.meta?.exportDownloadUrl)
      return {
        signedUrl: job.meta.exportDownloadUrl,
      };

    if (!job.meta?.exportStorageKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Job does not have export storage key",
      });
    }

    let fileExtension = "";
    if (job.meta?.exportType === "txt") {
      fileExtension = ".txt";
    } else if (job.meta?.exportType === "jsonld") {
      fileExtension = ".json";
    } else if (job.meta?.exportType === "pdf") {
      fileExtension = ".zip";
    }
    console.log("fileextension", fileExtension);
    const expiresInSeconds = 12 * 60 * 60;
    const signedUrl = await getSignedDownloadUrl(
      ObjectTypes.DATA_EXPORT,
      job.meta.exportStorageKey,
      {
        expiresInSeconds,
        fileExtension,
      },
    );

    return {
      signedUrl,
    };
  });
