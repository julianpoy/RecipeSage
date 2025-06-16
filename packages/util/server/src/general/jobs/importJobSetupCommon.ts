import { JobStatus, JobType } from "@prisma/client";
import { prisma, type JobMeta } from "@recipesage/prisma";
import { cleanLabelTitle } from "@recipesage/util/shared";
import { metrics } from "../metrics";

export async function importJobSetupCommon(args: {
  importType: JobMeta["importType"];
  labels: string[];
  userId: string;
}) {
  const timer = metrics.jobFinished.startTimer();

  metrics.jobStarted.inc({
    job_type: "import",
    import_type: args.importType,
  });

  const importLabels = args.labels.map((label) => cleanLabelTitle(label));

  const job = await prisma.job.create({
    data: {
      userId: args.userId,
      type: JobType.IMPORT,
      status: JobStatus.RUN,
      progress: 1,
      meta: {
        importType: args.importType,
        importLabels,
      } satisfies JobMeta,
    },
  });

  return { job, timer, importLabels };
}
