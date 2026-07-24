import { Injectable, inject } from "@angular/core";
import { AlertController } from "@ionic/angular/standalone";
import { HttpService } from "./http.service";
import { serverConfig } from "../utils/serverConfig";
import { forceSWUpdate } from "../utils/forceSWUpdate";

@Injectable({
  providedIn: "root",
})
export class VersionCheckService {
  private httpService = inject(HttpService);
  private alertCtrl = inject(AlertController);

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
          const alert = await this.alertCtrl.create({
            header: "App is out of date",
            subHeader:
              "The cached app version is very old. The app will restart to update.",
            buttons: [
              {
                text: "Ok",
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
