import "./sentry-init.js";
import type { SandboxedJob } from "bullmq";
import * as Sentry from "@sentry/node";
import {
  markJobFailed,
  processWorkerJob,
  type JobQueueItem,
} from "@recipesage/util/server/general";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";

const JOB_TIMEOUT_MINUTES = parseInt(
  process.env.JOB_QUEUE_JOB_TIMEOUT_MINUTES || "20",
);

const MARK_JOB_FAILED_TIMEOUT_MS = 10000;

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
      if ("jobId" in args.data && args.data.jobId) {
        await Promise.race([
          markJobFailed(args.data.jobId, JOB_RESULT_CODES.timeout).catch(
            (e) => {
              console.error(e);
              Sentry.captureException(e);
            },
          ),
          new Promise((resolve) =>
            setTimeout(resolve, MARK_JOB_FAILED_TIMEOUT_MS),
          ),
        ]);
      }
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
