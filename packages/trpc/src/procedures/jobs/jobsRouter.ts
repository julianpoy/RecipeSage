import { router } from "../../trpc";
import { getJob } from "./getJob";
import { getExportJobDownloadUrlById } from "./getExportJobDownloadUrlById";
import { getJobs } from "./getJobs";
import { startExportJob } from "./startExportJob";

export const jobsRouter = router({
  getJobs,
  getJob,
  getExportJobDownloadUrlById,
  startExportJob,
});
