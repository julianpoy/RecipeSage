import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { JobStatus } from "@prisma/client";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import { prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import { z } from "zod";
import {
  clipUrl,
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
  throttleDropPromise,
} from "@recipesage/util/server/general";

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
    const userId = res.locals.session.userId;

    const urls = req.body.urls;

    const { job, timer, importLabels } = await importJobSetupCommon({
      userId,
      importType: "urls",
      labels: req.query.labels?.split(",") || [],
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
            labels: importLabels,
          });
        } catch (_e) {
          // Skip entry
        }

        onClipProgress(i, urls.length);
      }

      await importJobFinishCommon({
        timer,
        job,
        userId,
        standardizedRecipeImportInput,
        importTempDirectory: undefined,
      });
    };

    start().catch(async (error) => {
      await importJobFailCommon({
        timer,
        job,
        error,
      });
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
