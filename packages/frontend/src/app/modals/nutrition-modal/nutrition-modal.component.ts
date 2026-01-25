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
  @Input() servings: number = 4;
  @Input() hasYield: boolean = true;

  // Use setter to initialize excluded ingredients when data arrives
  private _ingredientNutrition?: IngredientNutrition[];
  @Input()
  set ingredientNutrition(value: IngredientNutrition[] | undefined) {
    this._ingredientNutrition = value;
    // Initialize: exclude optional ingredients by default
    this.excludedIngredients = new Set(
      value?.filter((ing) => ing.optional).map((ing) => ing.name) ?? [],
    );
  }
  get ingredientNutrition(): IngredientNutrition[] | undefined {
    return this._ingredientNutrition;
  }

  scope: "serving" | "recipe" = "serving";
  excludedIngredients: Set<string> = new Set();

  toggleIngredient(name: string): void {
    if (this.excludedIngredients.has(name)) {
      this.excludedIngredients.delete(name);
    } else {
      this.excludedIngredients.add(name);
    }
    // Trigger change detection by creating new Set
    this.excludedIngredients = new Set(this.excludedIngredients);
  }

  isExcluded(name: string): boolean {
    return this.excludedIngredients.has(name);
  }

  get yieldContainsServings(): boolean {
    return /serving|serves/i.test(this.nutrition.yield ?? "");
  }

  get hasSubDetails(): boolean {
    return (
      this.displayData.saturatedFat !== undefined ||
      this.displayData.unsaturatedFat !== undefined ||
      this.displayData.fiber !== undefined ||
      this.displayData.sugar !== undefined ||
      this.displayData.sodium !== undefined ||
      this.displayData.cholesterol !== undefined
    );
  }

  /**
   * Returns nutrition data for display. When ingredient breakdown is available,
   * uses calculated totals for main macros to ensure numbers reconcile with the table.
   * Sub-details (saturated fat, fiber, etc.) still come from stored nutrition
   * since we don't track those at ingredient level.
   */
  get displayData(): NutritionInfo {
    // When we have ingredient data, use calculated totals for main macros
    // This ensures the macro summary matches the table totals
    const useCalculatedTotals =
      this.ingredientNutrition && this.ingredientNutrition.length > 0;
    // totals is already scope-aware (per-serving or per-recipe based on displayIngredients)
    const calc = useCalculatedTotals ? this.totals : null;

    if (this.scope === "serving") {
      return {
        ...this.nutrition,
        // Use calculated totals if available, otherwise use stored values
        calories: calc?.calories ?? this.nutrition.calories,
        fat: calc?.fat ?? this.nutrition.fat,
        carbs: calc?.carbs ?? this.nutrition.carbs,
        protein: calc?.protein ?? this.nutrition.protein,
      };
    }

    // Per-recipe view
    const multiplier = this.servings;

    // If using calculated totals, they're already full-recipe values (don't multiply again)
    // If using stored nutrition (per-serving), multiply by servings
    return {
      ...this.nutrition,
      calories: calc
        ? calc.calories
        : Math.round(this.nutrition.calories * multiplier),
      fat: calc ? calc.fat : Math.round(this.nutrition.fat * multiplier),
      carbs: calc ? calc.carbs : Math.round(this.nutrition.carbs * multiplier),
      protein: calc
        ? calc.protein
        : Math.round(this.nutrition.protein * multiplier),
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
      (ing) => !this.isExcluded(ing.name),
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
