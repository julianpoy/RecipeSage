import { Component } from "@angular/core";
import * as Sentry from "@sentry/browser";

import { RecipeService, ExportFormat } from "~/services/recipe.service";
import { RouteMap, UtilService } from "~/services/util.service";
import { UserService } from "../../../services/user.service";
import type { JobSummary } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";

export const getJobFailureI18n = (exportJob: JobSummary) => {
  switch (exportJob.resultCode) {
    default: {
      return "pages.import.jobs.status.fail.unknown";
    }
  }
};

const JOB_POLL_INTERVAL_MS = 7500;

@Component({
  selector: "page-export",
  templateUrl: "export.page.html",
  styleUrls: ["export.page.scss"],
})
export class ExportPage {
  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  /**
   * We show this many historical jobs
   */
  showJobs = 5;
  exportJobs: JobSummary[] = [];
  jobPollInterval?: NodeJS.Timeout;

  constructor(
    private utilService: UtilService,
    private trpcService: TRPCService,
    private recipeService: RecipeService,
  ) {}

  ionViewWillEnter() {
    this.setupJobStatusPoll();
  }

  ionViewWillLeave() {
    clearInterval(this.jobPollInterval);
  }

  setupJobStatusPoll() {
    if (this.jobPollInterval) clearInterval(this.jobPollInterval);
    this.load();

    this.jobPollInterval = setInterval(() => {
      this.load();
    }, JOB_POLL_INTERVAL_MS);
  }

  async load() {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.jobs.getJobs.query(),
    );
    if (response) {
      this.exportJobs = response
        .sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .filter((job) => {
          return job.type === "EXPORT";
        });
    } else {
      clearInterval(this.jobPollInterval);
    }
  }

  getRunningJob() {
    return this.exportJobs.filter((job) => job.status === "RUN").at(0);
  }

  formatItemCreationDate(plainTextDate: string | Date) {
    return this.utilService.formatDate(plainTextDate, {
      now: true,
      times: true,
    });
  }

  showMoreJobs() {
    this.showJobs += 5;
  }

  getExportURL(format: ExportFormat) {
    return this.recipeService.getExportURL(format);
  }

  async export(format: ExportFormat) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.jobs.startExportJob.mutate({
        format,
      }),
    );

    if (response) {
      this.setupJobStatusPoll();
    }
  }

  exportAsJSONLD() {
    this.export(ExportFormat.JSONLD);
  }

  exportAsTXT() {
    this.export(ExportFormat.TXT);
  }

  exportAsPDF() {
    this.export(ExportFormat.PDF);
  }

  getJobFailureI18n(job: JobSummary) {
    return getJobFailureI18n(job);
  }

  getJobTitleI18n(job: JobSummary): string {
    const exportType = job.meta?.exportType;
    if (!exportType) return "pages.export.jobs.job";

    switch (exportType) {
      case "pdf": {
        return "pages.export.jobs.job.pdf";
      }
      case "jsonld": {
        return "pages.export.jobs.job.jsonld";
      }
      case "txt": {
        return "pages.export.jobs.job.txt";
      }
      default: {
        Sentry.captureMessage("Job ExportType not handled", {
          extra: {
            exportType,
          },
        });
        return "pages.export.jobs.job";
      }
    }
  }
}
