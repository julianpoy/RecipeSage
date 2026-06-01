import type { JobQueueItem } from "../JobQueueItem";
import * as Sentry from "@sentry/node";
import {
  JobStatus,
  JobType,
  prisma,
  recipeSummary,
  type CookbookJobMeta,
  type JobSummary,
  type RecipeSummary,
} from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { convertPrismaRecipeSummaryToRecipeSummary } from "../../../db";
import { throttleDropPromise } from "../../throttleDropPromise";
import {
  convertJobProgress,
  updateJobProgress,
} from "../../jobs/updateJobProgress";
import { ObjectTypes, writeStream } from "../../../storage";
import { generateCookbookPDFStream } from "../../recipesToCookbookPDF";
import { translate } from "../../translate";

const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;
const COOKBOOK_JOB_STEP_COUNT = 1;

export const processCookbookJob = async (
  job: JobSummary,
  _jobQueueItem: JobQueueItem,
) => {
  if (job.type !== JobType.COOKBOOK) {
    throw new Error("Cookbook processor received a non-cookbook job");
  }

  const jobMeta = job.meta;

  const recipeIds = jobMeta.recipeIds ?? [];
  if (recipeIds.length === 0) {
    throw new Error("Cookbook job has no recipes");
  }

  const unorderedRecipes = await prisma.recipe.findMany({
    where: {
      userId: job.userId,
      id: { in: recipeIds },
    },
    ...recipeSummary,
  });

  const recipesById = new Map(
    unorderedRecipes.map((recipe) => [recipe.id, recipe]),
  );

  const recipes: RecipeSummary[] = recipeIds
    .map((id) => recipesById.get(id))
    .filter((recipe) => recipe !== undefined)
    .map(convertPrismaRecipeSummaryToRecipeSummary);

  if (recipes.length === 0) {
    throw new Error("Cookbook job resolved no recipes for the caller");
  }

  const totalCount = recipes.length;

  const language = jobMeta.language ?? "en-us";
  const introductionLabel = await translate(
    language,
    "pages.cookbook.field.introduction",
  );
  const contentsLabel = await translate(
    language,
    "pages.cookbook.pdf.contents",
  );
  const byAuthorTemplate = await translate(
    language,
    "pages.cookbook.pdf.byAuthor",
  );

  const onProgress = throttleDropPromise(async (processedCount: number) => {
    try {
      await updateJobProgress({
        jobId: job.id,
        userId: job.userId,
        progress: convertJobProgress({
          progress: totalCount > 0 ? processedCount / totalCount : 1,
          step: 1,
          totalStepCount: COOKBOOK_JOB_STEP_COUNT,
        }),
      });
    } catch (e) {
      Sentry.captureException(e);
      console.error(e);
    }
  }, JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000);

  const stream = await generateCookbookPDFStream(
    recipes,
    {
      title: jobMeta.cookbookTitle ?? "Cookbook",
      subtitle: jobMeta.cookbookSubtitle,
      introduction: jobMeta.cookbookIntroduction,
      author: jobMeta.cookbookAuthor,
      includeToc: jobMeta.cookbookIncludeToc ?? false,
      includeImages: jobMeta.cookbookIncludeImages ?? true,
      includeLabels: jobMeta.cookbookIncludeLabels ?? false,
      language,
      introductionLabel,
      contentsLabel,
      byAuthorTemplate,
    },
    onProgress,
  );

  const storageRecord = await writeStream(
    ObjectTypes.DATA_EXPORT,
    stream,
    "application/pdf",
  );

  await prisma.job.update({
    where: {
      id: job.id,
    },
    data: {
      status: JobStatus.SUCCESS,
      resultCode: JOB_RESULT_CODES.success,
      progress: 100,
      meta: {
        ...jobMeta,
        cookbookStorageBucket: storageRecord.bucket,
        cookbookStorageKey: storageRecord.key,
        cookbookDownloadUrl: storageRecord.location,
      } satisfies CookbookJobMeta,
    },
  });
};
