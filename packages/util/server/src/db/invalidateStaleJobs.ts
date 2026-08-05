import { JobStatus } from "@recipesage/prisma";
import { prisma } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import * as Sentry from "@sentry/node";
import { getJobQueue } from "../general/queue";

/**
 * Stale after minutes applies to the jobs last updatedAt time
 */
const STALE_AFTER_MINUTES = 30;
const QUEUE_UNAVAILABLE_STALE_AFTER_MINUTES = 180;
const INVALIDATION_PERIOD_MINUTES =
  process.env.NODE_ENV === "development" ? 1 : 10;
/**
 * Introduce some random variance between pods
 */
const INVALIDATION_PERIOD_VARIANCE_MS = Math.floor(Math.random() * 500);

const PENDING_QUEUE_STATES = [
  "waiting",
  "waiting-children",
  "prioritized",
  "delayed",
  "active",
  "paused",
] as const;

const getEnqueuedJobIds = async () => {
  const queuedJobs = await getJobQueue().getJobs([...PENDING_QUEUE_STATES]);

  const enqueuedJobIds = new Set<string>();
  for (const queuedJob of queuedJobs) {
    const data = queuedJob?.data;
    if (data && "jobId" in data && data.jobId) {
      enqueuedJobIds.add(data.jobId);
    }
  }

  return enqueuedJobIds;
};

export const invalidateStaleJobs = async () => {
  const staleAfterDate = new Date();
  staleAfterDate.setMinutes(staleAfterDate.getMinutes() - STALE_AFTER_MINUTES);

  const queueUnavailableStaleAfterDate = new Date();
  queueUnavailableStaleAfterDate.setMinutes(
    queueUnavailableStaleAfterDate.getMinutes() -
      QUEUE_UNAVAILABLE_STALE_AFTER_MINUTES,
  );

  const staleCandidates = await prisma.job.findMany({
    where: {
      updatedAt: {
        lt: staleAfterDate,
      },
      status: {
        in: [JobStatus.CREATE, JobStatus.RUN],
      },
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
    },
  });

  if (staleCandidates.length === 0) return;

  const hasCreateCandidates = staleCandidates.some(
    (job) => job.status === JobStatus.CREATE,
  );

  let enqueuedJobIds: Set<string> | undefined;
  if (hasCreateCandidates) {
    try {
      enqueuedJobIds = await getEnqueuedJobIds();
    } catch (e) {
      Sentry.captureException(e);
      enqueuedJobIds = undefined;
    }
  }

  const staleJobIds = staleCandidates
    .filter((job) => {
      if (job.status !== JobStatus.CREATE) return true;
      if (!enqueuedJobIds) {
        return job.updatedAt < queueUnavailableStaleAfterDate;
      }
      return !enqueuedJobIds.has(job.id);
    })
    .map((job) => job.id);

  if (staleJobIds.length === 0) return;

  const { count } = await prisma.job.updateMany({
    where: {
      id: {
        in: staleJobIds,
      },
      updatedAt: {
        lt: staleAfterDate,
      },
      status: {
        in: [JobStatus.CREATE, JobStatus.RUN],
      },
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
  setInterval(() => {
    invalidateStaleJobs().catch((e) => {
      Sentry.captureException(e);
    });
  }, time + INVALIDATION_PERIOD_VARIANCE_MS);
};
