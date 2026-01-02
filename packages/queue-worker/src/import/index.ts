import { Worker, Queue } from "bullmq";
import { JobStatus, JobType } from "@prisma/client";
import { prisma, type JobMeta } from "@recipesage/prisma";
import { urlsImportJobHandler } from "./handlers/urlsImportJobHandler";
import { pepperplateImportJobHandler } from "./handlers/pepperplateImportJobHandler";
import { jsonldImportJobHandler } from "./handlers/jsonldImportJobHandler";
import { csvImportJobHandler } from "./handlers/csvImportJobHandler";
import { paprikaImportJobHandler } from "./handlers/paprikaImportJobHandler";
import { recipekeeperImportJobHandler } from "./handlers/recipekeeperImportJobHandler";
import { textfilesImportJobHandler } from "./handlers/textfilesImportJobHandler";
import { pdfsImportJobHandler } from "./handlers/pdfsImportJobHandler";
import { imagesImportJobHandler } from "./handlers/imagesImportJobHandler";
import { enexImportJobHandler } from "./handlers/enexImportJobHandler";
import { cookmateImportJobHandler } from "./handlers/cookmateImportJobHandler";
import { copymethatImportJobHandler } from "./handlers/copymethatImportJobHandler";
import { fdxzImportJobHandler } from "./handlers/fdxzImportJobHandler";
import { lcbImportJobHandler } from "./handlers/lcbImportJobHandler";
import type { JobQueueItem } from "./handlers/JobQueueItem";

const JOB_QUEUE_NAME = "rsJobQueue";

export const jobQueue = new Queue<JobQueueItem, void>(JOB_QUEUE_NAME, {
  connection: {
    host: process.env.JOB_QUEUE_IMPORT_REDIS_HOST,
    port: parseInt(process.env.JOB_QUEUE_IMPORT_REDIS_PORT || "6379"),
  },
  prefix: JOB_QUEUE_NAME,
});

export const enqueueJob = (item: JobQueueItem) => {
  jobQueue.add(`${Date.now()}-${Math.random()}`, item);
};

export const jobQueueWorker = new Worker<JobQueueItem, void>(
  JOB_QUEUE_NAME,
  async (args) => {
    const prismaJob = await prisma.job.update({
      where: {
        id: args.data.jobId,
      },
      data: {
        status: JobStatus.RUN,
      },
    });

    if (prismaJob.type !== JobType.IMPORT) {
      throw new Error("Import queue received a non-import job");
    }
    const jobMeta = prismaJob.meta as JobMeta;

    switch (jobMeta.importType) {
      case "urls":
        await urlsImportJobHandler(prismaJob, args.data);
        break;
      case "pepperplate":
        await pepperplateImportJobHandler(prismaJob, args.data);
        break;
      case "jsonld":
        await jsonldImportJobHandler(prismaJob, args.data);
        break;
      case "csv":
        await csvImportJobHandler(prismaJob, args.data);
        break;
      case "paprika":
        await paprikaImportJobHandler(prismaJob, args.data);
        break;
      case "recipekeeper":
        await recipekeeperImportJobHandler(prismaJob, args.data);
        break;
      case "textFiles":
        await textfilesImportJobHandler(prismaJob, args.data);
        break;
      case "pdfs":
        await pdfsImportJobHandler(prismaJob, args.data);
        break;
      case "images":
        await imagesImportJobHandler(prismaJob, args.data);
        break;
      case "enex":
        await enexImportJobHandler(prismaJob, args.data);
        break;
      case "cookmate":
        await cookmateImportJobHandler(prismaJob, args.data);
        break;
      case "copymethat":
        await copymethatImportJobHandler(prismaJob, args.data);
        break;
      case "fdxz":
        await fdxzImportJobHandler(prismaJob, args.data);
        break;
      case "lcb":
        await lcbImportJobHandler(prismaJob, args.data);
        break;
      default:
        throw new Error(`Unsupported import type: ${jobMeta.importType}`);
    }

    console.log(`Finished processing job ${args.id}`);
  },
  {
    autorun: false,
    connection: {
      host: process.env.JOB_QUEUE_IMPORT_REDIS_HOST,
      port: parseInt(process.env.JOB_QUEUE_IMPORT_REDIS_PORT || "6379"),
    },
    prefix: JOB_QUEUE_NAME,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 50 },
    concurrency: parseInt(process.env.JOB_QUEUE_IMPORT_CONCURRENCY || "1"),
  },
);
