import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { enqueueJob } from "@recipesage/queue-worker";

const schema = {
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
  query: z.object({
    labels: z.string().optional(),
  }),
};

export const pepperplateHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    const { job } = await importJobSetupCommon({
      userId,
      importType: "pepperplate",
      labels: req.query.labels?.split(",") || [],
    });

    await enqueueJob({
      jobId: job.id,
      credentials: {
        username: req.body.username,
        password: req.body.password,
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
