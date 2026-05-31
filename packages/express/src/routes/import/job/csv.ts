import { BadRequestError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import multer from "multer";
import { createReadStream } from "fs";
import {
  importJobSetupCommon,
  multerAutoCleanup,
} from "@recipesage/util/server/general";
import { getRequestLanguage } from "@recipesage/util/server/general";
import {
  MAX_IMPORT_FILE_SIZE_MB,
  ObjectTypes,
  writeStream,
} from "@recipesage/util/server/storage";
import { enqueueJob } from "@recipesage/util/server/general";
import { z } from "zod";
import { tmpdir } from "os";

const schema = {
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const csvHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    beforeHandlers: [
      multerAutoCleanup,
      multer({
        storage: multer.diskStorage({
          destination: tmpdir(),
        }),
        limits: {
          fileSize: MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024,
        },
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
      importType: "csv",
      language: getRequestLanguage(req),
      labels: req.query.labels?.split(",") || [],
    });

    const fileStream = createReadStream(file.path);
    const storageRecord = await writeStream(
      ObjectTypes.IMPORT_DATA,
      fileStream,
      file.mimetype,
    );

    await enqueueJob({
      jobId: job.id,
      storageKey: storageRecord.key,
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
