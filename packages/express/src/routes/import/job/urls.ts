import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { ObjectTypes, writeBuffer } from "@recipesage/util/server/storage";
import { enqueueJob } from "@recipesage/queue-worker";

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

    const { job } = await importJobSetupCommon({
      userId,
      importType: "urls",
      labels: req.query.labels?.split(",") || [],
    });

    const urlsText = urls.join("\n");
    const buffer = Buffer.from(urlsText, "utf-8");
    const storageRecord = await writeBuffer(
      ObjectTypes.IMPORT_DATA,
      buffer,
      "text/plain",
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
