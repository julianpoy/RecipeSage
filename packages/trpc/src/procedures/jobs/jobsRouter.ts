import { router } from "../../trpc";
import { getJob } from "./getJob";
import { getExportJobDownloadUrlById } from "./getExportJobDownloadUrlById";
import { getJobDownloadUrlById } from "./getJobDownloadUrlById";
import { getJobs } from "./getJobs";
import { startExportJob } from "./startExportJob";
import { startCookbookJob } from "./startCookbookJob";

export const jobsRouter = router({
  getJobs,
  getJob,
  getExportJobDownloadUrlById,
  getJobDownloadUrlById,
  startExportJob,
  startCookbookJob,
});
