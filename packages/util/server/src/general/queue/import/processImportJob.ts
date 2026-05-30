import type { JobSummary } from "@recipesage/prisma";
import type { JobQueueItem } from "../JobQueueItem";
import { JobType } from "@recipesage/prisma";
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
import { melaImportJobHandler } from "./handlers/melaImportJobHandler";
import { croutonImportJobHandler } from "./handlers/croutonImportJobHandler";

export const IMPORT_JOB_STEP_COUNT = 3;

export const processImportJob = async (
  job: JobSummary,
  jobQueueItem: JobQueueItem,
) => {
  if (job.type !== JobType.IMPORT) {
    throw new Error("Import processor received a non-import job");
  }

  switch (job.meta.importType) {
    case "urls":
      await urlsImportJobHandler(job, jobQueueItem);
      break;
    case "pepperplate":
      await pepperplateImportJobHandler(job, jobQueueItem);
      break;
    case "jsonld":
      await jsonldImportJobHandler(job, jobQueueItem);
      break;
    case "csv":
      await csvImportJobHandler(job, jobQueueItem);
      break;
    case "paprika":
      await paprikaImportJobHandler(job, jobQueueItem);
      break;
    case "recipekeeper":
      await recipekeeperImportJobHandler(job, jobQueueItem);
      break;
    case "textFiles":
      await textfilesImportJobHandler(job, jobQueueItem);
      break;
    case "pdfs":
      await pdfsImportJobHandler(job, jobQueueItem);
      break;
    case "images":
      await imagesImportJobHandler(job, jobQueueItem);
      break;
    case "enex":
      await enexImportJobHandler(job, jobQueueItem);
      break;
    case "cookmate":
      await cookmateImportJobHandler(job, jobQueueItem);
      break;
    case "copymethat":
      await copymethatImportJobHandler(job, jobQueueItem);
      break;
    case "fdxz":
      await fdxzImportJobHandler(job, jobQueueItem);
      break;
    case "lcb":
      await lcbImportJobHandler(job, jobQueueItem);
      break;
    case "mela":
      await melaImportJobHandler(job, jobQueueItem);
      break;
    case "crouton":
      await croutonImportJobHandler(job, jobQueueItem);
      break;
    default:
      throw new Error(`Unsupported import type: ${job.meta.importType}`);
  }
};
