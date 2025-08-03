import { Injectable, inject } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { MealOption } from "@prisma/client";

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
  mealOptions: MealOption[] = [];
  
  constructor() {
    DEFAULT_MEAL_CONFIGURATION.map(mealOption => {
      this.mealOptions.push({
        ...mealOption,
        userId: "0",
        createdAt: createdAt,
        updatedAt: createdAt,
        title: this.translate.instant(`components.mealCalendar.${mealOption.id}`),
      });
    });
  }

  get() {
    return this.mealOptions;
  }
}
