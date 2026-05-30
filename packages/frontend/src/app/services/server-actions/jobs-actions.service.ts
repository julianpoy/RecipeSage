import { Injectable } from "@angular/core";

import { ErrorHandlers } from "../http-error-handler.service";
import { ActionsBase, RouterInputs, RouterOutputs } from "./actions-base";
import { getLocalDb, ObjectStoreName } from "../../utils/localDb";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";

@Injectable({
  providedIn: "root",
})
export class JobsActionsService extends ActionsBase {
  getJob(
    input: RouterInputs["jobs"]["getJob"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["getJob"] | undefined> {
    return this.executeQuery(
      () => this.trpc.jobs.getJob.query(input),
      async () => {
        const localDb = await getLocalDb();
        return localDb.get(ObjectStoreName.Jobs, input.id);
      },
      errorHandlers,
    );
  }

  getJobs(
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["getJobs"] | undefined> {
    return this.executeQuery(
      () => this.trpc.jobs.getJobs.query(),
      async () => {
        const localDb = await getLocalDb();
        const session = await appIdbStorageManager.getSession();
        if (!session) return undefined;

        const jobs = await localDb.getAll(ObjectStoreName.Jobs);
        return jobs.filter((job) => job.userId === session.userId);
      },
      errorHandlers,
    );
  }

  startExportJob(
    input: RouterInputs["jobs"]["startExportJob"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["startExportJob"] | undefined> {
    return this.passThrough(
      () => this.trpc.jobs.startExportJob.mutate(input),
      errorHandlers,
    );
  }

  startCookbookJob(
    input: RouterInputs["jobs"]["startCookbookJob"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["startCookbookJob"] | undefined> {
    return this.passThrough(
      () => this.trpc.jobs.startCookbookJob.mutate(input),
      errorHandlers,
    );
  }

  /** @deprecated Use getJobDownloadUrlById instead */
  getExportJobDownloadUrlById(
    input: RouterInputs["jobs"]["getExportJobDownloadUrlById"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["getExportJobDownloadUrlById"] | undefined> {
    return this.passThrough(
      () => this.trpc.jobs.getExportJobDownloadUrlById.query(input),
      errorHandlers,
    );
  }

  getJobDownloadUrlById(
    input: RouterInputs["jobs"]["getJobDownloadUrlById"],
    errorHandlers?: ErrorHandlers,
  ): Promise<RouterOutputs["jobs"]["getJobDownloadUrlById"] | undefined> {
    return this.passThrough(
      () => this.trpc.jobs.getJobDownloadUrlById.query(input),
      errorHandlers,
    );
  }
}
