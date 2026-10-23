import {
  Component,
  Input,
  Output,
  EventEmitter,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  DEFAULT_MEAL_I18N,
  getOrderedMeals,
  getMealDisplayNames,
} from "@recipesage/util/shared";
import { IonItem, IonSelect, IonSelectOption } from "@ionic/angular";

const LAST_USED_MEAL_VAR = "lastUsedMeal";

@Component({
  standalone: true,
  selector: "select-meal",
  templateUrl: "select-meal.component.html",
  styleUrls: ["./select-meal.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonItem, IonSelect, IonSelectOption],
})
export class SelectMealComponent implements OnInit, OnChanges {
  private translate = inject(TranslateService);

  @Input() meal = "";
  @Input() customMealOptions: string | null = null;
  @Output() mealChange = new EventEmitter();

  mealOptions: { title: string; key: string }[] = [];

  ngOnInit() {
    this.buildMealOptions();
  }

  ngOnChanges(changes: SimpleChanges) {
    const customMealOptionsChange = changes["customMealOptions"];
    if (customMealOptionsChange && !customMealOptionsChange.firstChange) {
      this.buildMealOptions();
    }
  }

  async buildMealOptions() {
    const orderedMeals = getOrderedMeals(this.customMealOptions);
    const displayNames = getMealDisplayNames(this.customMealOptions);

    const options: { title: string; key: string }[] = [];
    for (const mealKey of orderedMeals) {
      const i18nKey = DEFAULT_MEAL_I18N[mealKey];
      if (i18nKey) {
        const translated = await this.translate.get(i18nKey).toPromise();
        options.push({ key: mealKey, title: translated });
      } else {
        options.push({
          key: mealKey,
          title: displayNames[mealKey.toLowerCase()] || mealKey,
        });
      }
    }

    this.mealOptions = options;

    if (!this.meal) {
      this.selectLastUsedMeal();
    }
  }

  selectLastUsedMeal() {
    const lastUsedMeal = localStorage.getItem(LAST_USED_MEAL_VAR);
    const mealExists = this.mealOptions.find(
      (option) => option.key.toLowerCase() === lastUsedMeal?.toLowerCase(),
    );

    if (lastUsedMeal && mealExists) {
      this.meal = mealExists.key;

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
