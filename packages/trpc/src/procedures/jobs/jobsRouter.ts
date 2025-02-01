import { router } from "../../trpc";
import { getJob } from "./getJob";
import { getJobs } from "./getJobs";
import { startExportJob } from "./startExportJob";

export const jobsRouter = router({
  getJobs,
  getJob,
  startExportJob,
});
