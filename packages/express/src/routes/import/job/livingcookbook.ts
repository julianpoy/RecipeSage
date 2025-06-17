import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { z } from "zod";
import { spawn } from "child_process";
import {
  deletePathsSilent,
  importJobFailCommon,
  importJobSetupCommon,
  metrics,
} from "@recipesage/util/server/general";
import { Capabilities, JOB_RESULT_CODES } from "@recipesage/util/shared";

const schema = {
  query: z.object({
    excludeImages: z.union([z.literal("true"), z.literal("false")]),
    includeStockRecipes: z.union([z.literal("true"), z.literal("false")]),
    includeTechniques: z.union([z.literal("true"), z.literal("false")]),
    labels: z.string().optional(),
  }),
};

export const livingcookbookHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multer({
        dest: "/tmp/import/",
      }).single("file"),
    ],
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    const cleanupPaths: string[] = [];

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const { job, timer, importLabels } = await importJobSetupCommon({
      userId,
      importType: "lcb",
      labels: req.query.labels?.split(",") || [],
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      cleanupPaths.push(file.path);

      const canImportMultipleImages = await userHasCapability(
        res.locals.session.userId,
        Capabilities.MultipleImages,
      );

      const optionalFlags = [];
      if (req.query.excludeImages === "true")
        optionalFlags.push("--excludeImages");
      if (req.query.includeStockRecipes === "true")
        optionalFlags.push("--includeStockRecipes");
      if (req.query.includeTechniques === "true")
        optionalFlags.push("--includeTechniques");
      if (canImportMultipleImages) optionalFlags.push("--multipleImages");

      const lcbImportJob = spawn("node_modules/ts-node/dist/bin.js", [
        "--project",
        "packages/backend/tsconfig.json",
        "packages/backend/src/lcbimport.app.js",
        file.path,
        res.locals.session.userId,
        importLabels.join(",") || "null",
        ...optionalFlags,
      ]);
      let errData = "";
      lcbImportJob.stderr.setEncoding("utf8");
      lcbImportJob.stderr.on("data", (err) => {
        console.error(err);
        errData += err;
      });
      lcbImportJob.stdout.setEncoding("utf8");
      lcbImportJob.stdout.on("data", (msg) => {
        console.log(msg);
      });
      const closePromise = new Promise<void>((resolve, reject) => {
        lcbImportJob.on("close", async (code) => {
          switch (code) {
            case 0: {
              resolve();
              break;
            }
            case 3: {
              reject(new Error("Bad format"));
              break;
            }
            default: {
              reject(new Error(errData));
              break;
            }
          }
        });
      });

      await closePromise;

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 75,
        },
      });

      const recipesToIndex = await prisma.recipe.findMany({
        where: {
          userId: res.locals.session.userId,
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

      metrics.jobFinished.observe(
        {
          job_type: "import",
          import_type: "lcb",
        },
        timer(),
      );
    };

    start()
      .catch(async (error) => {
        await importJobFailCommon({
          timer,
          job,
          error,
        });
      })
      .finally(async () => {
        await deletePathsSilent(cleanupPaths);
      });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
