import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  AlertController,
  ToastController,
  ToggleCustomEvent,
} from "@ionic/angular";
import { MealOption, MealOptionService } from "~/services/meal-option.service";
import { UtilService, RouteMap, AuthType } from "~/services/util.service";
import { LoadingService } from "~/services/loading.service";
import { TranslateService } from "@ngx-translate/core";
import { RecipeService } from "~/services/recipe.service";
import type { MealOptionSummary } from "@recipesage/prisma";
import { TRPCService } from "../../../../services/trpc.service";
import {
  SelectableItem,
  SelectMultipleItemsComponent,
} from "../../../../components/select-multiple-items/select-multiple-items.component";
import { SHARED_UI_IMPORTS } from "../../../../providers/shared-ui.provider";

@Component({
  selector: "page-new-meal-option-modal",
  templateUrl: "new-meal-option-modal.page.html",
  styleUrls: ["new-meal-option-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectMultipleItemsComponent],
})
export class NewMealOptionModalPage {
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private utilService = inject(UtilService);
  private mealOptionService = inject(MealOptionService);
  private recipeService = inject(RecipeService);
  private trpcService = inject(TRPCService);

  @Input({
    required: false,
  })
  mealOption?: MealOptionSummary;

  title: string = "";
  mealTime: string = "00:00";

  mealOptions: MealOption[] = [];

  async ionViewWillEnter() {
    const mealOptions = await this.mealOptionService.fetch();
    if (mealOptions) {
      this.mealOptions = mealOptions;
    }
  }

  onMealTimeChange(event: any) {
    const value = event.detail.value;
    if (Array.isArray(value) && value.length > 0) {
      this.mealTime = value[0];
    } else if (typeof value === "string") {
      this.mealTime = value;
    }
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  mapLabelsToSelectableItems(mealOptions: MealOption[]) {
    const mapped = mealOptions.map((mealOption) => ({
      id: mealOption.id,
      title: mealOption.title,
      icon: "pricetag",
    }));

    return mapped;
  }

  save() {
    this.saveMealOption();
  }

  async saveMealOption() {
    if (!this.title) return;

    const loading = this.loadingService.start();

    const header = await this.translate
      .get("pages.settings.mealOptions.updateConflict.header")
      .toPromise();

    const message = await this.translate
      .get("pages.settings.mealOptions.updateConflict.message")
      .toPromise();

    const okay = await this.translate.get("generic.okay").toPromise();

    await this.mealOptionService.create(
      {
        title: this.title,
        mealTime: this.mealTime,
      },
      {
        409: async () => {
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
        },
      },
    );

    loading.dismiss();

    this.cancel();
  }
}
