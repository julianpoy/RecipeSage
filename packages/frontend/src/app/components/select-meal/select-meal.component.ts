import {
  Component,
  Input,
  Output,
  EventEmitter,
  type AfterViewInit,
  inject,
} from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  MealOption,
  MealOptionService,
} from "../../services/meal-option.service";
import { MealOptionDefaultService } from "../../services/meal-option-default.service";
import { TRPCService } from "../../services/trpc.service";
import { MealOptionsPreferenceKey } from "@recipesage/util/shared";
import { PreferencesService } from "../../services/preferences.service";
import { RouteMap } from "../../services/util.service";
import { NavController } from "@ionic/angular";

const LAST_USED_MEAL_VAR = "lastUsedMeal";

@Component({
  selector: "select-meal",
  templateUrl: "select-meal.component.html",
  styleUrls: ["./select-meal.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectMealComponent implements AfterViewInit {
  @Input() meal = "";
  @Output() mealChange = new EventEmitter();
  @Output() settingsCallback = new EventEmitter();

  mealOptionService = inject(MealOptionService);
  mealOptionDefaultService = inject(MealOptionDefaultService);
  trpcService = inject(TRPCService);
  preferencesService = inject(PreferencesService);
  navCtrl = inject(NavController);

  mealOptionsHref = RouteMap.MealOptionsPage.getPath();
  mealOptions: MealOption[] = [];

  ngAfterViewInit() {
    this.loadMealOptions();

    if (!this.meal) {
      this.selectLastUsedMeal();
    }
  }

  async loadMealOptions() {
    this.mealOptionService.fetch().then((options) => {
      this.mealOptions = this.mealOptionDefaultService.add(options ?? []);
    });
  }

  selectLastUsedMeal() {
    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = this.mealOptions.find(
      (option) => option.mealTime === lastUsedMeal,
    );

    if (lastUsedMeal && mealExists) {
      this.meal = lastUsedMeal;

      setTimeout(() => {
        this.mealChanged();
      });
    }
  }

  saveLastUsedMeal() {
    localStorage.setItem(LAST_USED_MEAL_VAR, this.meal);
  }

  onClickSettings() {
    this.navCtrl.navigateForward(this.mealOptionsHref);
    this.settingsCallback.emit();
  }

  getLabel(mealOption: MealOption) {
    return this.preferencesService.preferences[
      MealOptionsPreferenceKey.ShowTime
    ]
      ? `${mealOption.title} - ${mealOption.mealTime}`
      : mealOption.title;
  }

  mealChanged() {
    this.mealChange.emit(this.meal);
    this.saveLastUsedMeal();
  }
}
