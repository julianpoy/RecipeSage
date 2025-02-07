import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
import { clipUrl, throttleDropPromise } from "@recipesage/util/server/general";

const JOB_PROGRESS_UPDATE_PERIOD_SECONDS = 3;

const schema = {
  body: z.object({
    urls: z.array(z.string()).min(1).max(5000),
  }),
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const urlsHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const userLabels =
      req.query.labels?.split(",").map((label) => cleanLabelTitle(label)) || [];

    const urls = req.body.urls;

    const job = await prisma.job.create({
      data: {
        userId: res.locals.session.userId,
        type: JobType.IMPORT,
        status: JobStatus.RUN,
        progress: 1,
        meta: {
          importType: "urls",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

      const onClipProgress = throttleDropPromise(
        async (processed: number, totalCount: number) => {
          try {
            await prisma.job.updateMany({
              where: {
                id: job.id,
                status: JobStatus.RUN,
              },
              data: {
                progress: Math.max(
                  Math.floor((processed / totalCount) * 100) / 2,
                  1,
                ),
              },
            });
          } catch (e) {
            Sentry.captureException(e);
            console.error(e);
          }
        },
        JOB_PROGRESS_UPDATE_PERIOD_SECONDS * 1000,
      );

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];

        try {
          const clipResults = await clipUrl(url);
          standardizedRecipeImportInput.push({
            ...clipResults,
            labels: userLabels,
          });
        } catch (e) {
          // Skip entry
        }

        onClipProgress(i, urls.length);
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 51,
        },
      });

      const createdRecipeIds = await importStandardizedRecipes(
        res.locals.session.userId,
        standardizedRecipeImportInput,
      );

      const recipesToIndex = await prisma.recipe.findMany({
        where: {
          id: {
            in: createdRecipeIds,
          },
          userId: res.locals.session.userId,
        },
      });

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 75,
        },
      });

      await indexRecipes(recipesToIndex);

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.SUCCESS,
          resultCode: JOB_RESULT_CODES.success,
          progress: 100,
        },
      });
    };

    start().catch(async (e) => {
      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.FAIL,
          resultCode: JOB_RESULT_CODES.unknown,
        },
      });

      Sentry.captureException(e, {
        extra: {
          jobId: job.id,
        },
      });
      console.error(e);
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
