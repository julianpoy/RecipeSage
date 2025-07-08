import { JobStatus, type Job } from "@prisma/client";
import { prisma, type JobMeta } from "@recipesage/prisma";
import { metrics } from "../metrics";
import * as Sentry from "@sentry/node";
import { getImportJobResultCode } from "./getImportJobResultCode";

export class ImportNoRecipesError extends Error {
  constructor() {
    super();
    this.name = "ImportNoRecipesError";
  }
}

export class ImportBadFormatError extends Error {
  constructor() {
    super();
    this.name = "ImportBadFormatError";
  }
}

export async function importJobFailCommon(args: {
  timer: ReturnType<typeof metrics.jobFinished.startTimer>;
  job: Job;
  error: unknown;
}) {
  const isBadZipError =
    args.error instanceof Error &&
    args.error.message ===
      "end of central directory record signature not found";

  const isBadFormatError =
    args.error instanceof ImportBadFormatError ||
    (args.error instanceof Error && args.error.name === "Bad format");

  const isNoRecipesError = args.error instanceof ImportNoRecipesError;

  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      status: JobStatus.FAIL,
      resultCode: getImportJobResultCode({
        isBadFormat: isBadZipError || isBadFormatError,
        isNoRecipes: isNoRecipesError,
      }),
    },
  });

  if (!isBadFormatError && !isNoRecipesError) {
    Sentry.captureException(args.error, {
      extra: {
        jobId: args.job.id,
      },
    });
    console.error(args.error);

    metrics.jobFailed.observe(
      {
        job_type: "import",
        import_type: (args.job.meta as JobMeta).importType,
      },
      args.timer(),
    );
  }
}
