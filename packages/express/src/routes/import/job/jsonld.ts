import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { z } from "zod";
import {
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
  JsonLD,
  jsonLDToStandardizedRecipeImportEntry,
} from "@recipesage/util/server/general";

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
    const userId = res.locals.session.userId;

    const file = req.file?.buffer.toString() || req.body.jsonLD;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const { job, timer, importLabels } = await importJobSetupCommon({
      userId,
      importType: "jsonld",
      labels: req.query.labels?.split(",") || [],
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
          labels: [...result.labels, ...importLabels],
        };
      });

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
