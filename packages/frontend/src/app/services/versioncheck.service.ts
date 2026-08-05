import { Injectable, inject } from "@angular/core";
import { AlertController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { HttpService } from "./http.service";
import { serverConfig } from "../utils/serverConfig";
import { forceSWUpdate } from "../utils/forceSWUpdate";

@Injectable({
  providedIn: "root",
})
export class VersionCheckService {
  private httpService = inject(HttpService);
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);

  async checkVersion() {
    const version = (window as any).version;
    if (version === "stg") return;

    const url = `${serverConfig.apiBase}versioncheck?version=${version}`;

    this.httpService
      .request<{ supported: boolean }>({
        method: "get",
        url,
      })
      .then(async (res) => {
        if (res && res.data && !res.data.supported) {
          const header = await this.translate
            .get("services.versionCheck.outOfDate.header")
            .toPromise();
          const subHeader = await this.translate
            .get("services.versionCheck.outOfDate.message")
            .toPromise();
          const okay = await this.translate.get("generic.okay").toPromise();

          const alert = await this.alertCtrl.create({
            header,
            subHeader,
            buttons: [
              {
                text: okay,
                role: "cancel",
                handler: () => {
                  forceSWUpdate().finally(() => {
                    window.location.reload();
                  });
                },
              },
            ],
          });
          alert.present();
        }
      })
      .catch((e) => {
        console.log("Unable to check for update.");
      });
  }
}
