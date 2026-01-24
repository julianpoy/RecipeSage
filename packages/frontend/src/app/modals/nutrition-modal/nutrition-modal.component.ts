import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

export interface NutritionInfo {
  servingSize: string;
  yield?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  saturatedFat?: number;
  unsaturatedFat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  cholesterol?: number;
}

export interface IngredientNutrition {
  name: string;
  quantity?: string;
  grams: number;
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
  estimated?: boolean;
  optional?: boolean;
}

@Component({
  standalone: true,
  selector: "nutrition-modal",
  templateUrl: "nutrition-modal.component.html",
  styleUrls: ["nutrition-modal.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class NutritionModalComponent {
  private modalCtrl = inject(ModalController);

  @Input() nutrition!: NutritionInfo;
  @Input() ingredientNutrition?: IngredientNutrition[];
  @Input() servings: number = 4;
  @Input() hasYield: boolean = true;

  scope: "serving" | "recipe" = "serving";
  includeOptional: boolean = false;

  get hasOptionalIngredients(): boolean {
    return this.ingredientNutrition?.some((ing) => ing.optional) ?? false;
  }

  get optionalIngredientName(): string {
    const optional = this.ingredientNutrition?.find((ing) => ing.optional);
    return optional?.name ?? "optional ingredients";
  }

  get displayData(): NutritionInfo {
    if (this.scope === "serving") {
      return this.nutrition;
    }

    const multiplier = this.servings;
    return {
      ...this.nutrition,
      calories: Math.round(this.nutrition.calories * multiplier),
      carbs: Math.round(this.nutrition.carbs * multiplier),
      protein: Math.round(this.nutrition.protein * multiplier),
      fat: Math.round(this.nutrition.fat * multiplier),
      saturatedFat:
        this.nutrition.saturatedFat != null
          ? Math.round(this.nutrition.saturatedFat * multiplier)
          : undefined,
      unsaturatedFat:
        this.nutrition.unsaturatedFat != null
          ? Math.round(this.nutrition.unsaturatedFat * multiplier)
          : undefined,
      fiber:
        this.nutrition.fiber != null
          ? Math.round(this.nutrition.fiber * multiplier)
          : undefined,
      sugar:
        this.nutrition.sugar != null
          ? Math.round(this.nutrition.sugar * multiplier)
          : undefined,
      sodium:
        this.nutrition.sodium != null
          ? Math.round(this.nutrition.sodium * multiplier)
          : undefined,
      cholesterol:
        this.nutrition.cholesterol != null
          ? Math.round(this.nutrition.cholesterol * multiplier)
          : undefined,
    };
  }

  get displayIngredients(): IngredientNutrition[] | undefined {
    if (!this.ingredientNutrition) return undefined;

    if (this.scope === "serving") {
      return this.ingredientNutrition.map((ing) => ({
        ...ing,
        grams: Math.round(ing.grams / this.servings),
        calories: Math.round(ing.calories / this.servings),
        fat: Math.round(ing.fat / this.servings),
        carbs: Math.round(ing.carbs / this.servings),
        protein: Math.round(ing.protein / this.servings),
      }));
    }

    return this.ingredientNutrition;
  }

  get totals(): {
    grams: number;
    calories: number;
    fat: number;
    carbs: number;
    protein: number;
  } {
    if (!this.displayIngredients) {
      return { grams: 0, calories: 0, fat: 0, carbs: 0, protein: 0 };
    }

    const items = this.displayIngredients.filter(
      (ing) => !ing.optional || this.includeOptional,
    );

    return items.reduce(
      (acc, ing) => ({
        grams: acc.grams + ing.grams,
        calories: acc.calories + ing.calories,
        fat: acc.fat + ing.fat,
        carbs: acc.carbs + ing.carbs,
        protein: acc.protein + ing.protein,
      }),
      { grams: 0, calories: 0, fat: 0, carbs: 0, protein: 0 },
    );
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
