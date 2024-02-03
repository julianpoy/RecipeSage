import { Injectable } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { UtilService } from "./util.service";
import { HttpService } from "./http.service";

@Injectable({
  providedIn: "root",
})
export class VersionCheckService {
  constructor(
    private utilService: UtilService,
    private httpService: HttpService,
    private alertCtrl: AlertController,
  ) {
    this.checkVersion();
  }

  async checkVersion() {
    const version = (window as any).version;
    if (version === "stg") return;

    const url = `${this.utilService.getBase()}versioncheck?version=${version}`;

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
                  try {
                    (window as any).forceSWUpdate().then(() => {
                      (window as any).location.reload(true);
                    });
                  } catch (e) {
                    (window as any).location.reload(true);
                  }
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
