import { JobStatus } from "@prisma/client";
import { prisma } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import Sentry from "@sentry/node";

/**
 * Stale after minutes applies to the jobs last updatedAt time
 */
const STALE_AFTER_MINUTES = 10;
const INVALIDATION_PERIOD_MINUTES =
  process.env.NODE_ENV === "development" ? 1 : 10;
/**
 * Introduce some random variance between pods
 */
const INVALIDATION_PERIOD_VARIANCE_MS = Math.floor(Math.random() * 500);

export const invalidateStaleJobs = async () => {
  const staleAfterDate = new Date();
  staleAfterDate.setMinutes(staleAfterDate.getMinutes() - STALE_AFTER_MINUTES);

  const { count } = await prisma.job.updateMany({
    where: {
      updatedAt: {
        lt: staleAfterDate,
      },
      status: JobStatus.RUN,
    },
    data: {
      status: JobStatus.FAIL,
      resultCode: JOB_RESULT_CODES.timeout,
    },
  });

  if (count > 0) {
    Sentry.captureMessage(
      "Jobs were left in a hanging state and were timed out",
      {
        extra: {
          count,
        },
      },
    );
  }
};

export const setupInvalidateStaleJobsInterval = () => {
  if (process.env.NODE_ENV === "test") return;

  const time = INVALIDATION_PERIOD_MINUTES * 60 * 1000;
  setInterval(invalidateStaleJobs, time + INVALIDATION_PERIOD_VARIANCE_MS);
};
