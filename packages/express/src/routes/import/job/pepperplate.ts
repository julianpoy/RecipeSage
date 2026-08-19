import { AuthenticationEnforcement } from "../../../authenticationEnforcement";
import { defineHandler } from "../../../defineHandler";
import { z } from "zod";
import { importJobSetupCommon } from "@recipesage/util/server/general";
import { enqueueJob } from "@recipesage/util/server/general";
import { getRequestLanguage } from "@recipesage/util/server/general";

const schema = {
  response: z.object({
    jobId: z.string(),
  }),
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
    openapi: {
      operationId: "import-importPepperplate",
      method: "post",
      path: "/import/job/pepperplate",
      tags: ["import"],
      summary: "Import recipes from a Pepperplate account",
      successStatus: 201,
    },
  },
  async (req, res) => {
    const userId = res.locals.session.userId;

    const { job } = await importJobSetupCommon({
      userId,
      importType: "pepperplate",
      language: getRequestLanguage(req),
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
