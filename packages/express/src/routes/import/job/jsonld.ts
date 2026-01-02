import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { ObjectTypes, writeBuffer } from "@recipesage/util/server/storage";
import { enqueueJob } from "@recipesage/queue-worker";

const schema = {
  body: z
    .object({
      jsonLD: z.any().optional(),
    })
    .optional(),
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

    const fileContent = req.file?.buffer.toString() || req.body?.jsonLD;
    if (!fileContent) {
      throw new BadRequestError(
        "Request must include multipart file under the 'file' field or jsonLD in body",
      );
    }

    const { job } = await importJobSetupCommon({
      userId,
      importType: "jsonld",
      labels: req.query.labels?.split(",") || [],
    });

    const buffer = Buffer.from(fileContent, "utf-8");
    const storageRecord = await writeBuffer(
      ObjectTypes.IMPORT_DATA,
      buffer,
      "application/json",
    );

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
