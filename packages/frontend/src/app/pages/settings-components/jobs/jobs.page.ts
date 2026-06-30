import { Component, inject } from "@angular/core";

import { RouteMap, UtilService } from "../../../services/util.service";
import type { JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { WebsocketService } from "../../../services/websocket.service";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
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
  IonText,
} from "@ionic/angular/standalone";
import {
  bookOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  documentOutline,
  listOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

/**
 * Polling is a fallback for ws updates
 */
const JOB_POLL_INTERVAL_MS = 60_000;

@Component({
  standalone: true,
  selector: "page-jobs",
  templateUrl: "jobs.page.html",
  styleUrls: ["jobs.page.scss"],
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
    IonText,
    NullStateComponent,
  ],
})
export class JobsPage {
  constructor() {
    addIcons({
      bookOutline,
      cloudDownloadOutline,
      cloudUploadOutline,
      documentOutline,
      listOutline,
    });
  }

  private utilService = inject(UtilService);
  private serverActionsService = inject(ServerActionsService);
  private websocketService = inject(WebsocketService);

  defaultBackHref: string = RouteMap.SettingsPage.getPath();

  showJobs = 10;
  jobs: JobSummary[] = [];
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
      this.jobs = response.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } else {
      clearInterval(this.jobPollInterval);
    }
  }

  formatItemCreationDate(plainTextDate: string | Date) {
    return this.utilService.formatDate(plainTextDate, {
      now: true,
      times: true,
    });
  }

  showMoreJobs() {
    this.showJobs += 10;
  }

  isDownloadable(job: JobSummary) {
    return (
      job.status === "SUCCESS" &&
      (job.type === "EXPORT" || job.type === "COOKBOOK")
    );
  }

  async downloadJob(job: JobSummary) {
    if (!this.isDownloadable(job)) return;

    const response = await this.serverActionsService.jobs.getJobDownloadUrlById(
      {
        id: job.id,
      },
    );
    if (!response) return;
    window.open(response.signedUrl, "_blank", 'rel="noopener"');
  }

  getJobIcon(job: JobSummary): string {
    switch (job.type) {
      case "COOKBOOK":
        return "book-outline";
      case "IMPORT":
        return "cloud-upload-outline";
      default:
        return "document-outline";
    }
  }

  getJobTitleI18n(job: JobSummary): string {
    switch (job.type) {
      case "COOKBOOK":
        return "pages.jobs.job.cookbook";
      case "IMPORT":
        return "pages.jobs.job.import";
      case "EXPORT": {
        switch (job.meta.exportType) {
          case "pdf":
            return "pages.jobs.job.export.pdf";
          case "txt":
            return "pages.jobs.job.export.txt";
          case "jsonld":
            return "pages.jobs.job.export.jsonld";
          default:
            return "pages.jobs.job.export";
        }
      }
      default:
        return "pages.jobs.job.export";
    }
  }

  getJobFailureI18n(job: JobSummary): string {
    switch (job.resultCode) {
      case JOB_RESULT_CODES.badFile:
        return "pages.import.jobs.status.fail.badFile";
      case JOB_RESULT_CODES.emptyFile:
        return "pages.import.jobs.status.fail.emptyFile";
      case JOB_RESULT_CODES.badCredentials:
        return "pages.import.jobs.status.fail.badCredentials";
      case JOB_RESULT_CODES.tooManyRecipes:
        return "pages.import.jobs.status.fail.tooManyRecipes";
      default:
        return "pages.import.jobs.status.fail.unknown";
    }
  }
}
