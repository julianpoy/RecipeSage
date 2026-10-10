import { Component, inject } from "@angular/core";

import { RouteMap, UtilService } from "../../../services/util.service";
import { ImportService } from "../../../services/import.service";
import { ThirdPartyAiConsentService } from "../../../services/third-party-ai-consent.service";
import { PendingShareService } from "../../../services/pending-share.service";
import { AlertController, NavController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonButton,
  IonProgressBar,
} from "@ionic/angular/standalone";

const MAX_FILE_SIZE_MB = 3000;

@Component({
  standalone: true,
  selector: "page-import-pdfs",
  templateUrl: "import-pdfs.page.html",
  styleUrls: ["import-pdfs.page.scss"],
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
    IonButton,
    IonProgressBar,
  ],
})
export class ImportPDFsPage {
  private importService = inject(ImportService);
  private thirdPartyAiConsentService = inject(ThirdPartyAiConsentService);
  private utilService = inject(UtilService);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private pendingShareService = inject(PendingShareService);

  defaultBackHref: string = RouteMap.ImportPage.getPath();

  file?: File;
  fileRejectedAsTooLarge = false;
  progress?: number;

  setFile(event: any) {
    const files = (event.srcElement || event.target).files;
    if (!files) {
      return;
    }

    this.file = files[0];
    this.fileRejectedAsTooLarge = false;
  }

  filePicker() {
    document.getElementById("filePicker")?.click();
  }

  isFileTooLarge() {
    if (this.fileRejectedAsTooLarge) {
      return true;
    }
    if (this.file && this.file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
      return true;
    }
    return false;
  }

  showFileTypeWarning() {
    if (!this.file || !this.file.name) return false;
    return !this.file.name.toLowerCase().endsWith(".zip");
  }

  isSinglePdf() {
    if (!this.file) return false;
    if (this.file.type === "application/pdf") return true;
    return this.file.name.toLowerCase().endsWith(".pdf");
  }

  async createRecipeFromPdf() {
    if (!this.file) return;

    this.pendingShareService.set({ kind: "document", file: this.file });
    await this.navCtrl.navigateForward(RouteMap.EditRecipePage.getPath("new"));
  }

  async submit() {
    if (!this.file || this.isSinglePdf()) return;
    if (!(await this.thirdPartyAiConsentService.ensureConsent())) return;

    const response = await this.importService.importPDFs(
      this.file,
      {
        413: () => {
          this.fileRejectedAsTooLarge = true;
        },
      },
      (event) => {
        this.progress = event.progress;
      },
    );
    this.progress = undefined;

    if (!response.success) return;

    const header = await this.translate
      .get("pages.import.jobCreated.header")
      .toPromise();
    const message = await this.translate
      .get("pages.import.jobCreated.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });

    await this.navCtrl.navigateForward(RouteMap.ImportPage.getPath(), {
      replaceUrl: true,
    });

    await alert.present();
  }
}
