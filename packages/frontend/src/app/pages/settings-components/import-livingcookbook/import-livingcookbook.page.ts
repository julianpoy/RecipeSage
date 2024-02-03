import { Component } from "@angular/core";
import { NavController, ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { LoadingRef, LoadingService } from "~/services/loading.service";
import { RecipeService } from "~/services/recipe.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";

@Component({
  selector: "page-import-livingcookbook",
  templateUrl: "import-livingcookbook.page.html",
  styleUrls: ["import-livingcookbook.page.scss"],
})
export class ImportLivingcookbookPage {
  defaultBackHref: string = RouteMap.ImportPage.getPath();

  loading?: LoadingRef;
  imageFile?: File;

  ignoreLargeFiles: boolean;
  includeTechniques = false;
  includeStockRecipes = false;
  excludeImages = false;

  troubleshoot = false;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public loadingService: LoadingService,
    public toastCtrl: ToastController,
    public recipeService: RecipeService,
    public utilService: UtilService,
  ) {
    this.ignoreLargeFiles = !!localStorage.getItem("largeFileOverride");
  }

  setFile(event: any) {
    const files = (event.srcElement || event.target).files;
    if (!files) {
      return;
    }

    this.imageFile = files[0];
  }

  filePicker() {
    document.getElementById("filePicker")?.click();
  }

  isFileLargerThanMB(size: number) {
    if (this.imageFile && this.imageFile.size / 1024 / 1024 > size) {
      // File is larger than 350MB
      return true;
    }
    return false;
  }

  isFileLarge() {
    if (!this.ignoreLargeFiles) return this.isFileLargerThanMB(350);
    return false;
  }

  isFileTooLarge() {
    if (!this.ignoreLargeFiles) return this.isFileLargerThanMB(650);
    return false;
  }

  isFileSelected() {
    return this.imageFile && this.imageFile.name;
  }

  isLCBFormat() {
    if (!this.imageFile) return false;

    if (!this.isFileSelected()) return false;
    return this.imageFile.name.toLowerCase().endsWith(".lcb");
  }

  isFDXZFormat() {
    if (!this.imageFile) return false;

    if (!this.isFileSelected()) return false;
    return (
      this.imageFile.name.toLowerCase().endsWith(".fdx") ||
      this.imageFile.name.toLowerCase().endsWith(".fdxz")
    );
  }

  showFileTypeWarning() {
    if (!this.isFileSelected()) return false;
    return !this.isLCBFormat() && !this.isFDXZFormat();
  }

  async presentToast(msg: string) {
    (
      await this.toastCtrl.create({
        message: msg,
        duration: 6000,
      })
    ).present();
  }

  async submit() {
    if (!this.imageFile) return;

    this.loading = this.loadingService.start();

    const errorHandlers = {
      406: async () => {
        const message = await this.translate
          .get("pages.importLivingCookbook.error")
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
      },
      504: async () => {
        setTimeout(async () => {
          const message = await this.translate
            .get("pages.importLivingCookbook.timeout")
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
          this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
        }, 20000);
      },
    };

    let importPromise;
    if (this.isFDXZFormat()) {
      importPromise = this.recipeService.importFDXZ(
        this.imageFile,
        {
          excludeImages: this.excludeImages || undefined,
        },
        errorHandlers,
      );
    } else {
      importPromise = this.recipeService.importLCB(
        this.imageFile,
        {
          includeStockRecipes: this.includeStockRecipes || undefined,
          includeTechniques: this.includeTechniques || undefined,
          excludeImages: this.excludeImages || undefined,
        },
        errorHandlers,
      );
    }

    const response = await importPromise;
    this.loading.dismiss();
    this.loading = undefined;
    if (!response.success) return;

    const message = await this.translate
      .get("pages.importLivingCookbook.success")
      .toPromise();

    this.presentToast(message);

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
  }
}
