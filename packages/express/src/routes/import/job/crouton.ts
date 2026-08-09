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
import { handleUploadErrors } from "../../../util/handleUploadErrors";

const schema = {
  response: z.object({
    jobId: z.string(),
  }),
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const croutonHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
    openapi: {
      method: "post",
      path: "/import/job/crouton",
      tags: ["import"],
      summary: "Import recipes from a Crouton export",
      successStatus: 201,
      upload: {
        field: "file",
      },
    },
    beforeHandlers: [
      multerAutoCleanup,
      handleUploadErrors(
        multer({
          storage: multer.diskStorage({
            destination: tmpdir(),
          }),
          limits: {
            fileSize: MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024,
          },
        }).single("file"),
      ),
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
      importType: "crouton",
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
