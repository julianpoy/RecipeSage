import type { JobSummary } from "@recipesage/prisma";

export const getJobFailureI18n = (importJob: JobSummary) => {
  switch (importJob.resultCode) {
    case 5: {
      return "pages.import.jobs.status.fail.badFile";
    }
    default: {
      return "pages.import.jobs.status.fail.unknown";
    }
  }
};
