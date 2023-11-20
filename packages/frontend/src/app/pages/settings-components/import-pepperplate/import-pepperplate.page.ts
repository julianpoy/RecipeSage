import { Component } from "@angular/core";
import {
  NavController,
  ToastController,
  AlertController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { RecipeService } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";

@Component({
  selector: "page-import-pepperplate",
  templateUrl: "import-pepperplate.page.html",
  styleUrls: ["import-pepperplate.page.scss"],
  providers: [RecipeService],
})
export class ImportPepperplatePage {
  defaultBackHref: string = RouteMap.ImportPage.getPath();

  username = "";
  password = "";

  errorMessage = "";

  loading = false;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public utilService: UtilService,
    public recipeService: RecipeService,
  ) {}

  async scrapePepperplate() {
    if (this.username.trim().length === 0) {
      const message = await this.translate
        .get("pages.importPepperplate.usernameRequired")
        .toPromise();
      this.errorMessage = message;
      return;
    }

    if (this.password.trim().length === 0) {
      const message = await this.translate
        .get("pages.importPepperplate.passwordRequired")
        .toPromise();
      this.errorMessage = message;
      return;
    }

    const loading = this.loadingService.start();

    this.loading = true;

    const response = await this.recipeService.scrapePepperplate(
      {
        username: this.username,
        password: this.password,
      },
      {
        406: async () => {
          const header = await this.translate
            .get("pages.importPepperplate.invalid.header")
            .toPromise();
          const message = await this.translate
            .get("pages.importPepperplate.invalid.message")
            .toPromise();
          const okay = await this.translate.get("generic.okay").toPromise();

          (
            await this.alertCtrl.create({
              header,
              message,
              buttons: [
                {
                  text: okay,
                },
              ],
            })
          ).present();
        },
        504: () => {
          setTimeout(async () => {
            const header = await this.translate
              .get("pages.importPepperplate.timeout.header")
              .toPromise();
            const message = await this.translate
              .get("pages.importPepperplate.timeout.message")
              .toPromise();
            const okay = await this.translate.get("generic.okay").toPromise();

            (
              await this.alertCtrl.create({
                header,
                message,
                buttons: [
                  {
                    text: okay,
                    handler: () => {},
                  },
                ],
              })
            ).present();
          }, 20000);
        },
        "*": () => {
          setTimeout(async () => {
            const message = await this.translate
              .get("pages.importPepperplate.error.message")
              .toPromise();
            const okay = await this.translate.get("generic.okay").toPromise();

            (
              await this.toastCtrl.create({
                message,
                buttons: [
                  {
                    text: okay,
                    role: "cancel",
                  },
                ],
              })
            ).present();
          }, 10000);
        },
      },
    );
    this.loading = false;
    loading.dismiss();

    if (!response.success) return;

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));

    const message = await this.translate
      .get("pages.importPepperplate.success")
      .toPromise();
    const close = await this.translate.get("generic.close").toPromise();

    (
      await this.toastCtrl.create({
        message,
        buttons: [
          {
            text: close,
            role: "cancel",
          },
        ],
      })
    ).present();
  }
}
