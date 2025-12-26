import { Component, inject } from "@angular/core";

import { RouteMap, UtilService } from "~/services/util.service";
import { ImportService } from "../../../services/import.service";
import { AlertController, NavController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-import-urls",
  templateUrl: "import-urls.page.html",
  styleUrls: ["import-urls.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class ImportUrlsPage {
  private importService = inject(ImportService);
  private utilService = inject(UtilService);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);

  defaultBackHref: string = RouteMap.ImportPage.getPath();

  urls: string = "";

  async submit() {
    const urls = this.urls.split("\n").filter((el) => el.trim());

    const response = await this.importService.importUrls(urls, undefined);

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
