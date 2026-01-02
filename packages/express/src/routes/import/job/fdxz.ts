import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { createReadStream } from "fs";
import { unlink } from "fs/promises";
import { userHasCapability } from "@recipesage/util/server/capabilities";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { ObjectTypes, writeStream } from "@recipesage/util/server/storage";
import { enqueueJob } from "@recipesage/queue-worker";
import { Capabilities } from "@recipesage/util/shared";

const schema = {
  query: z.object({
    excludeImages: z.union([z.literal("true"), z.literal("false")]),
    labels: z.string().optional(),
  }),
};

export const fdxzHandler = defineHandler(
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
      importType: "fdxz",
      labels: req.query.labels?.split(",") || [],
    });

    const canImportMultipleImages = await userHasCapability(
      res.locals.session.userId,
      Capabilities.MultipleImages,
    );

    // Stream file to S3
    const fileStream = createReadStream(file.path);
    const storageRecord = await writeStream(
      ObjectTypes.IMPORT_DATA,
      fileStream,
      file.mimetype,
    );

    // Delete temp file
    await unlink(file.path);

    // Enqueue job for worker processing
    await enqueueJob({
      jobId: job.id,
      s3StorageKey: storageRecord.key,
      options: {
        excludeImages: req.query.excludeImages === "true",
        canImportMultipleImages,
      },
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
