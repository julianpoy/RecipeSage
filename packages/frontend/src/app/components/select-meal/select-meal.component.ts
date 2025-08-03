import {
  Component,
  Input,
  Output,
  EventEmitter,
  type AfterViewInit,
  inject,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { MealOption, MealOptionService } from "../../services/meal-option.service";

const LAST_USED_MEAL_VAR = "lastUsedMeal";


// TODO: Integrate with meal options service
const DEFAULT_MEAL_OPTIONS = [
  {
    title: "",
    key: "breakfast",
  },
  {
    title: "",
    key: "lunch",
  },
  {
    title: "",
    key: "dinner",
  },
  {
    title: "",
    key: "snacks",
  },
  {
    title: "",
    key: "other",
  },
];


@Component({
  selector: "select-meal",
  templateUrl: "select-meal.component.html",
  styleUrls: ["./select-meal.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectMealComponent implements AfterViewInit {
  private translate = inject(TranslateService);

  @Input() meal = "";
  @Output() mealChange = new EventEmitter();

  mealOptionService = inject(MealOptionService);
  mealOptions: MealOption[] = [];

  ngAfterViewInit() {
    this.loadMealOptions();

    if (!this.meal) {
      this.selectLastUsedMeal();
    }

    this.loadTranslations();
  }

  async loadMealOptions() {
    this.mealOptionService.fetch().then((response) => {
      if (response.data) {
        this.mealOptions = response.data;
      }
    });
  }

  async loadTranslations() {
    const breakfast = await this.translate
      .get("components.selectMeal.breakfast")
      .toPromise();
    const lunch = await this.translate
      .get("components.selectMeal.lunch")
      .toPromise();
    const dinner = await this.translate
      .get("components.selectMeal.dinner")
      .toPromise();
    const snack = await this.translate
      .get("components.selectMeal.snack")
      .toPromise();
    const other = await this.translate
      .get("components.selectMeal.other")
      .toPromise();
  }

  selectLastUsedMeal() {
    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = this.mealOptions.find((option) => option.mealTime === lastUsedMeal);

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

  mealChanged() {
    this.mealChange.emit(this.meal);
    this.saveLastUsedMeal();
  }
}
