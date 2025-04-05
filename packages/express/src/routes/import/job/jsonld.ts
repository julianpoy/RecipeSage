import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import { importStandardizedRecipes } from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import Sentry from "@sentry/node";
import { z } from "zod";
import {
  getImportJobResultCode,
  JsonLD,
  jsonLDToStandardizedRecipeImportEntry,
} from "@recipesage/util/server/general";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";

const schema = {
  body: z.object({
    jsonLD: z.any(),
  }),
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const jsonldHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 1e8, files: 1 },
      }).single("file"),
    ],
  },
  async (req, res) => {
    const userLabels =
      req.query.labels?.split(",").map((label) => cleanLabelTitle(label)) || [];

    const file = req.file?.buffer.toString() || req.body.jsonLD;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const job = await prisma.job.create({
      data: {
        userId: res.locals.session.userId,
        type: JobType.IMPORT,
        status: JobStatus.RUN,
        progress: 1,
        meta: {
          importType: "jsonld",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const input = JSON.parse(file) as JsonLD | JsonLD[];

      let jsonLD: JsonLD[];
      if (Array.isArray(input)) jsonLD = input;
      else jsonLD = [input];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jsonLD = jsonLD.filter((el: any) => el["@type"] === "Recipe");

      if (!jsonLD.length) {
        throw new BadRequestError(
          "Only supports JSON-LD or array of JSON-LD with type 'Recipe'",
        );
      }

      const standardizedRecipeImportInput = jsonLD.map((ld: JsonLD) => {
        const result = jsonLDToStandardizedRecipeImportEntry(ld);
        return {
          ...result,
          labels: [...result.labels, ...userLabels],
        };
      });

      if (standardizedRecipeImportInput.length === 0) {
        throw new Error("No recipes");
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 50,
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
      const isBadFormatError = e instanceof BadRequestError;

      const isNoRecipesError = e instanceof Error && e.message === "No recipes";

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.FAIL,
          resultCode: getImportJobResultCode({
            isBadFormat: isBadFormatError,
            isNoRecipes: isNoRecipesError,
          }),
        },
      });

      if (!isBadFormatError && !isNoRecipesError) {
        Sentry.captureException(e, {
          extra: {
            jobId: job.id,
          },
        });
        console.error(e);
      }
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
