import { Component, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import * as Sentry from "@sentry/browser";

import { ExportFormat } from "../../../services/recipe.service";
import { RouteMap, UtilService } from "../../../services/util.service";
import type { ExportJobSummary } from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { WebsocketService } from "../../../services/websocket.service";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonProgressBar,
  IonButton,
  IonList,
} from "@ionic/angular/standalone";
import { cloudDownload, document } from "ionicons/icons";
import { addIcons } from "ionicons";

export const getJobFailureI18n = (exportJob: ExportJobSummary) => {
  switch (exportJob.resultCode) {
    default: {
      return "pages.import.jobs.status.fail.unknown";
    }
  }
};

/**
 * Polling is a fallback for ws updates
 */
const JOB_POLL_INTERVAL_MS = 60_000;

@Component({
  standalone: true,
  selector: "page-export",
  templateUrl: "export.page.html",
  styleUrls: ["export.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonProgressBar,
    IonButton,
    IonList,
  ],
})
export class ExportPage {
  constructor() {
    addIcons({ cloudDownload, document });
  }

  private utilService = inject(UtilService);
  private serverActionsService = inject(ServerActionsService);
  private websocketService = inject(WebsocketService);
  private translate = inject(TranslateService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  /**
   * We show this many historical jobs
   */
  showJobs = 5;
  exportJobs: ExportJobSummary[] = [];
  jobPollInterval?: NodeJS.Timeout;

  ionViewWillEnter() {
    this.setupJobStatusPoll();
    this.websocketService.on("job:updated", this.onWSEvent);
  }

  ionViewWillLeave() {
    clearInterval(this.jobPollInterval);
    this.websocketService.off("job:updated", this.onWSEvent);
  }

  setupJobStatusPoll() {
    if (this.jobPollInterval) clearInterval(this.jobPollInterval);
    this.load();

    this.jobPollInterval = setInterval(() => {
      this.load();
    }, JOB_POLL_INTERVAL_MS);
  }

  onWSEvent = () => {
    this.load();
  };

  async load() {
    const response = await this.serverActionsService.jobs.getJobs({
      "0": () => {
        // Do nothing
      },
    });
    if (response) {
      this.exportJobs = response
        .sort((a, b) => {
          return b.createdAt.getTime() - a.createdAt.getTime();
        })
        .filter((job): job is ExportJobSummary => job.type === "EXPORT");
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

  async export(format: ExportFormat) {
    const response = await this.serverActionsService.jobs.startExportJob({
      format,
      language: this.translate.getCurrentLang(),
    });

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

  async downloadJob(job: ExportJobSummary) {
    if (job.status !== "SUCCESS") return;

    const response = await this.serverActionsService.jobs.getJobDownloadUrlById(
      {
        id: job.id,
      },
    );
    if (!response) return;
    window.open(response.signedUrl, "_blank", 'rel="noopener"');
  }

  getJobFailureI18n(job: ExportJobSummary) {
    return getJobFailureI18n(job);
  }

  getJobTitleI18n(job: ExportJobSummary): string {
    const exportType = job.meta.exportType;
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
