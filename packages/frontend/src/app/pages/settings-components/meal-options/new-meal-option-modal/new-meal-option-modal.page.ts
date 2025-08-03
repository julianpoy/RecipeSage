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
import { Time } from "@angular/common";

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
  mealTime: string = "12:00";
  type: "label" | "group" | null = null;

  mealOptions: MealOption[] = [];

  warnWhenNotPresent = false;

  async ionViewWillEnter() {
    const mealOptions = await this.trpcService.handle(
      this.trpcService.trpc.mealOptions.getMealOptions.query(),
    );
    if (mealOptions) {
      this.mealOptions = mealOptions;
    }
  }

  warnToggle(event: ToggleCustomEvent) {
    this.warnWhenNotPresent = event.detail.checked;
  }

  onMealTimeChange(event: any) {
    const value = event.detail.value;
    if (Array.isArray(value) && value.length > 0) {
      this.mealTime = value[0];
    } else if (typeof value === 'string') {
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

    await this.trpcService.handle(
      this.trpcService.trpc.mealOptions.createMealOption.mutate({
        title: this.title,
        mealTime: this.mealTime,
      }),
    );
    loading.dismiss();

    this.cancel();
  }
}
