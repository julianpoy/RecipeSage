import { Component, inject } from "@angular/core";

import { RouteMap, UtilService } from "~/services/util.service";
import { ImportService } from "../../../services/import.service";
import { AlertController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

const MAX_FILE_SIZE_MB = 1000;

@Component({
  selector: "page-import-livingcookbok",
  templateUrl: "import-livingcookbook.page.html",
  styleUrls: ["import-livingcookbook.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ImportLivingcookbookPage {
  private importService = inject(ImportService);
  private utilService = inject(UtilService);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);

  defaultBackHref: string = RouteMap.ImportPage.getPath();

  file?: File;
  progress?: number;

  options = {
    excludeImages: false,
    includeStockRecipes: false,
    includeTechniques: false,
  };

  setFile(event: any) {
    const files = (event.srcElement || event.target).files;
    if (!files) {
      return;
    }

    this.file = files[0];
  }

  filePicker() {
    document.getElementById("filePicker")?.click();
  }

  isFileTooLarge() {
    if (this.file && this.file.size / 1024 / 1024 > MAX_FILE_SIZE_MB) {
      return true;
    }
    return false;
  }

  showFileTypeWarning() {
    return this.file && !this.isLCB() && !this.isFDX() && !this.isFDXZ();
  }

  isLCB() {
    return !!this.file?.name.toLowerCase().endsWith(".lcb");
  }

  isFDX() {
    return !!this.file?.name.toLowerCase().endsWith(".fdx");
  }

  isFDXZ() {
    return !!this.file?.name.toLowerCase().endsWith(".fdxz");
  }

  async submit() {
    if (!this.file) return;

    if (this.isFDXZ() || this.isFDX()) {
      const response = await this.importService.importFdxz(
        this.file,
        this.options,
        undefined,
        (event) => {
          this.progress = event.progress;
        },
      );
      this.progress = undefined;

      if (!response.success) return;
    } else {
      const response = await this.importService.importLivingcookbook(
        this.file,
        this.options,
        undefined,
        (event) => {
          this.progress = event.progress;
        },
      );
      this.progress = undefined;

      if (!response.success) return;
    }

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
