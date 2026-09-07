import { JobStatus } from "@recipesage/prisma";
import {
  prisma,
  type ImportJobMeta,
  type ImportJobSummary,
} from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import {
  importStandardizedRecipes,
  type StandardizedRecipeImportEntry,
} from "../../db/importStandardizedRecipes";
import { ImportNoRecipesError } from "./jobErrors";
import { convertJobProgress, updateJobProgress } from "./updateJobProgress";
import { IMPORT_JOB_STEP_COUNT } from "../queue/import/processImportJob";
import { CreditOperation, recordCreditsSpent } from "../credits";

export async function importJobFinishCommon(args: {
  job: ImportJobSummary;
  userId: string;
  standardizedRecipeImportInput: StandardizedRecipeImportEntry[];
  importTempDirectory: string | undefined;
  creditOperation?: CreditOperation;
  partialCount?: number;
  failedCount?: number;
  failedUrls?: string[];
}) {
  const hasMetaUpdates =
    args.partialCount !== undefined ||
    args.failedCount !== undefined ||
    args.failedUrls !== undefined;

  if (args.standardizedRecipeImportInput.length === 0) {
    if (hasMetaUpdates) {
      await prisma.job.update({
        where: {
          id: args.job.id,
        },
        data: {
          meta: {
            ...args.job.meta,
            partialCount: args.partialCount,
            failedCount: args.failedCount,
            failedUrls: args.failedUrls,
          } satisfies ImportJobMeta,
        },
      });
    }

    throw new ImportNoRecipesError();
  }

  await updateJobProgress({
    jobId: args.job.id,
    userId: args.job.userId,
    progress: convertJobProgress({
      progress: 0,
      step: 2,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    }),
  });

  const createdRecipeIds = await importStandardizedRecipes(
    args.userId,
    args.standardizedRecipeImportInput,
    args.job.meta.language || "en-us",
    args.importTempDirectory,
  );

  await updateJobProgress({
    jobId: args.job.id,
    userId: args.job.userId,
    progress: convertJobProgress({
      progress: 0,
      step: 3,
      totalStepCount: IMPORT_JOB_STEP_COUNT,
    }),
  });

  await prisma.job.update({
    where: {
      id: args.job.id,
    },
    data: {
      status: JobStatus.SUCCESS,
      resultCode: JOB_RESULT_CODES.success,
      progress: 100,
      ...(hasMetaUpdates && {
        meta: {
          ...args.job.meta,
          partialCount: args.partialCount,
          failedCount: args.failedCount,
          failedUrls: args.failedUrls,
        } satisfies ImportJobMeta,
      }),
    },
  });

  if (args.creditOperation && createdRecipeIds.length > 0) {
    await recordCreditsSpent(args.userId, args.creditOperation);
  }
}
