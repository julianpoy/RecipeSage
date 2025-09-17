import { Injectable, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { MealOption } from "@prisma/client";

import { MealOptionsPreferenceKey } from "@recipesage/util/shared";
import { PreferencesService } from "./preferences.service";

const createdAt = new Date(1754228165000);

const DEFAULT_MEAL_CONFIGURATION = [
  {
    id: "breakfast",
    mealTime: "10:00",
  },
  {
    id: "lunch",
    mealTime: "13:00",
  },
  {
    id: "dinner",
    mealTime: "18:00",
  },
  {
    id: "snack",
    mealTime: "19:00",
  },
  {
    id: "other",
    mealTime: "20:00",
  },
];

@Injectable({
  providedIn: "root",
})
export class MealOptionDefaultService {
  translate = inject(TranslateService);
  preferencesService = inject(PreferencesService);

  mealOptions: MealOption[] = [];

  constructor() {
    DEFAULT_MEAL_CONFIGURATION.map((option) => {
      // fill to match MealOption interface
      this.mealOptions.push({
        ...option,
        userId: "0",
        createdAt: createdAt,
        updatedAt: createdAt,
        title: this.translate.instant(`components.mealCalendar.${option.id}`),
      });
    });
  }

  add(userCreatedOptions: MealOption[]): MealOption[] {
    if (
      !this.preferencesService.preferences[
        MealOptionsPreferenceKey.ShowDefaults
      ]
    ) {
      return userCreatedOptions;
    }

    let mealOpts = [...this.mealOptions, ...userCreatedOptions];

    mealOpts.sort((a: MealOption, b: MealOption) => {
      return a.mealTime < b.mealTime ? -1 : 1;
    });

    return mealOpts;
  }
}
