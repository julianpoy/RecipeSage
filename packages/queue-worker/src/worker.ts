import "./sentry-init.js";
import type { SandboxedJob } from "bullmq";
import * as Sentry from "@sentry/node";
import {
  processWorkerJob,
  type JobQueueItem,
} from "@recipesage/util/server/general";

const JOB_TIMEOUT_MINUTES = parseInt(
  process.env.JOB_QUEUE_JOB_TIMEOUT_MINUTES || "20",
);

module.exports = async function jobWorker(
  args: SandboxedJob<JobQueueItem, unknown>,
) {
  const killTimeout = setTimeout(
    async () => {
      console.error("Job timed out");
      Sentry.captureMessage("job timed out", {
        extra: {
          ...args,
        },
      });
      await Sentry.flush(10000);
      process.exit(1);
    },
    JOB_TIMEOUT_MINUTES * 60 * 1000,
  );

  try {
    await processWorkerJob(args);
  } finally {
    clearTimeout(killTimeout);
  }
};
