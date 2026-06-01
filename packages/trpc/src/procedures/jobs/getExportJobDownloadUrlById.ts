import { prisma, prismaJobSummaryToJobSummary } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { jobSummary } from "@recipesage/prisma";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getSignedDownloadUrl,
  ObjectTypes,
} from "@recipesage/util/server/storage";

/** @deprecated Use getJobDownloadUrlById instead */
export const getExportJobDownloadUrlById = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/jobs/getExportJobDownloadUrlById",
      tags: ["jobs"],
      summary: "Get a signed download URL for the result of an export job",
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
    const _job = await prisma.job.findUniqueOrThrow({
      where: {
        userId: ctx.session.userId,
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
    if (job.type !== "EXPORT") {
      throw new TRPCError({
        code: "NOT_FOUND",
      });
    }

    if (!job.meta.exportStorageKey && job.meta.exportDownloadUrl)
      return {
        signedUrl: job.meta.exportDownloadUrl,
      };

    if (!job.meta.exportStorageKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Job does not have export storage key",
      });
    }

    let fileExtension = "";
    if (job.meta.exportType === "txt") {
      fileExtension = ".txt";
    } else if (job.meta.exportType === "jsonld") {
      fileExtension = ".json";
    } else if (job.meta.exportType === "pdf") {
      fileExtension = ".zip";
    }
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
