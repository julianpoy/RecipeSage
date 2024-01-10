import { Component, Input, Output, EventEmitter } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

const LAST_USED_MEAL_VAR = "lastUsedMeal";

@Component({
  selector: "select-meal",
  templateUrl: "select-meal.component.html",
  styleUrls: ["./select-meal.component.scss"],
})
export class SelectMealComponent {
  @Input() meal = "";
  @Output() mealChange = new EventEmitter();

  mealOptions = [
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

  constructor(private translate: TranslateService) {}

  ngAfterViewInit() {
    if (!this.meal) {
      this.selectLastUsedMeal();
    }

    this.loadTranslations();
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

    this.mealOptions[0].title = breakfast;
    this.mealOptions[1].title = lunch;
    this.mealOptions[2].title = dinner;
    this.mealOptions[3].title = snack;
    this.mealOptions[4].title = other;
  }

  selectLastUsedMeal() {
    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = this.mealOptions.find(
      (option) => option.key === lastUsedMeal,
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

  mealChanged() {
    this.mealChange.emit(this.meal);
    this.saveLastUsedMeal();
  }
}
