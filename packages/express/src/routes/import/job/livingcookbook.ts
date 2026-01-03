import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { ObjectTypes, writeStream } from "@recipesage/util/server/storage";
import { enqueueJob } from "@recipesage/queue-worker";

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

    const file = req.file;
    if (!file) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field",
      );
    }

    const { job } = await importJobSetupCommon({
      userId,
      importType: "lcb",
      labels: req.query.labels?.split(",") || [],
      excludeImages: req.query.excludeImages === "true",
      includeStockRecipes: req.query.includeStockRecipes === "true",
      includeTechniques: req.query.includeTechniques === "true",
    });

    const fileStream = createReadStream(file.path);
    const storageRecord = await writeStream(
      ObjectTypes.IMPORT_DATA,
      fileStream,
      file.mimetype,
    );

    await unlink(file.path);

    await enqueueJob({
      jobId: job.id,
      s3StorageKey: storageRecord.key,
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
