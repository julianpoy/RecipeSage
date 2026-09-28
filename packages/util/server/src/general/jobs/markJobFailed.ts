import { prisma, JobStatus } from "@recipesage/prisma";
import type { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { onJobUpdate } from "./updateJobProgress";

export const markJobFailed = async (
  jobId: string,
  resultCode: (typeof JOB_RESULT_CODES)[keyof typeof JOB_RESULT_CODES],
) => {
  const updated = await prisma.job.updateManyAndReturn({
    where: {
      id: jobId,
      resultCode: null,
    },
    data: {
      status: JobStatus.FAIL,
      resultCode,
    },
    select: {
      userId: true,
    },
  });

  for (const { userId } of updated) {
    await onJobUpdate({
      jobId,
      userId,
    });
  }
};
