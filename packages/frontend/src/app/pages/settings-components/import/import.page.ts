import { Component } from "@angular/core";
import { NavController } from "@ionic/angular";

import { RouteMap, UtilService } from "~/services/util.service";
import { ImportService } from "../../../services/import.service";
import { TRPCService } from "../../../services/trpc.service";
import type { JobSummary } from "@recipesage/prisma";
import { getJobFailureI18n } from "../../../utils/getJobFailureI18n";

const JOB_POLL_INTERVAL_MS = 7500;

type ImportFormat =
  | "jsonld"
  | "pepperplate"
  | "livingcookbook"
  | "paprika"
  | "cookmate"
  | "recipekeeper";

@Component({
  selector: "page-import",
  templateUrl: "import.page.html",
  styleUrls: ["import.page.scss"],
})
export class ImportPage {
  importJobs: JobSummary[] = [];
  defaultBackHref: string = RouteMap.SettingsPage.getPath();
  jobPollInterval?: NodeJS.Timeout;

  constructor(
    private navCtrl: NavController,
    private importService: ImportService,
    private trpcService: TRPCService,
    private utilService: UtilService,
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
      this.importJobs = response.filter((job) => {
        return job.type === "IMPORT";
      });
    }
  }

  getRunningJob() {
    return this.importJobs.filter((job) => job.status === "RUN").at(0);
  }

  formatItemCreationDate(plainTextDate: string | Date) {
    return this.utilService.formatDate(plainTextDate, {
      now: true,
      times: true,
    });
  }

  startImport(format: ImportFormat) {
    switch (format) {
      case "jsonld": {
        this.navCtrl.navigateForward(RouteMap.ImportJSONLDPage.getPath());
        break;
      }
      case "pepperplate": {
        this.navCtrl.navigateForward(RouteMap.ImportPepperplatePage.getPath());
        break;
      }
      case "livingcookbook": {
        this.navCtrl.navigateForward(
          RouteMap.ImportLivingcookbookPage.getPath(),
        );
        break;
      }
      case "paprika": {
        this.navCtrl.navigateForward(RouteMap.ImportPaprikaPage.getPath());
        break;
      }
      case "cookmate": {
        this.navCtrl.navigateForward(RouteMap.ImportCookmatePage.getPath());
        break;
      }
      case "recipekeeper": {
        this.navCtrl.navigateForward(RouteMap.ImportRecipeKeeperPage.getPath());
        break;
      }
    }
  }

  getJobFailureI18n(job: JobSummary) {
    return getJobFailureI18n(job);
  }
}
