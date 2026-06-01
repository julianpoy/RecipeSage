import { Component, inject, type OnDestroy, type OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { NavController, ModalController } from "@ionic/angular/standalone";
import type { LabelSummary, RecipeSummary } from "@recipesage/prisma";
import { add, fitness, pricetag, removeCircle, remove } from "ionicons/icons";
import { addIcons } from "ionicons";

import { RouteMap, UtilService } from "../../../services/util.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { EventName, EventService } from "../../../services/event.service";
import { LoadingService } from "../../../services/loading.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import { SelectRecipeModalComponent } from "../../../components/select-recipe-modal/select-recipe-modal.component";
import { SelectLabelModalComponent } from "../../../components/select-label-modal/select-label-modal.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonSegment,
  IonSegmentButton,
  IonNote,
  IonBadge,
} from "@ionic/angular/standalone";

const RECIPE_PAGE_SIZE = 200;
const FETCH_CHUNK_SIZE = 100;
const MAX_SERVINGS = 999;

const DAILY_VALUES: Partial<Record<NumericNutritionKey, number>> = {
  nutritionTotalFat: 78,
  nutritionSaturatedFat: 20,
  nutritionCholesterol: 300,
  nutritionSodium: 2300,
  nutritionTotalCarbs: 275,
  nutritionDietaryFiber: 28,
  nutritionAddedSugars: 50,
  nutritionProtein: 50,
  nutritionVitaminD: 20,
  nutritionCalcium: 1300,
  nutritionIron: 18,
  nutritionPotassium: 4700,
};

type NumericNutritionKey =
  | "nutritionCalories"
  | "nutritionTotalFat"
  | "nutritionSaturatedFat"
  | "nutritionTransFat"
  | "nutritionPolyunsaturatedFat"
  | "nutritionMonounsaturatedFat"
  | "nutritionCholesterol"
  | "nutritionSodium"
  | "nutritionTotalCarbs"
  | "nutritionDietaryFiber"
  | "nutritionTotalSugars"
  | "nutritionAddedSugars"
  | "nutritionProtein"
  | "nutritionVitaminD"
  | "nutritionCalcium"
  | "nutritionIron"
  | "nutritionPotassium";

type NutritionUnit = "kcal" | "g" | "mg" | "mcg";

interface NutritionFieldDef {
  key: NumericNutritionKey;
  unit: NutritionUnit;
  indent?: boolean;
}

const NUTRITION_FIELDS: readonly NutritionFieldDef[] = [
  { key: "nutritionCalories", unit: "kcal" },
  { key: "nutritionTotalFat", unit: "g" },
  { key: "nutritionSaturatedFat", unit: "g", indent: true },
  { key: "nutritionTransFat", unit: "g", indent: true },
  { key: "nutritionPolyunsaturatedFat", unit: "g", indent: true },
  { key: "nutritionMonounsaturatedFat", unit: "g", indent: true },
  { key: "nutritionCholesterol", unit: "mg" },
  { key: "nutritionSodium", unit: "mg" },
  { key: "nutritionTotalCarbs", unit: "g" },
  { key: "nutritionDietaryFiber", unit: "g", indent: true },
  { key: "nutritionTotalSugars", unit: "g", indent: true },
  { key: "nutritionAddedSugars", unit: "g", indent: true },
  { key: "nutritionProtein", unit: "g" },
  { key: "nutritionVitaminD", unit: "mcg" },
  { key: "nutritionCalcium", unit: "mg" },
  { key: "nutritionIron", unit: "mg" },
  { key: "nutritionPotassium", unit: "mg" },
];

interface SelectedRecipe {
  id: string;
  title: string;
  servings: number;
  servingSize: string | null;
}

interface AggregateField {
  key: NumericNutritionKey;
  unit: NutritionUnit;
  indent: boolean;
  value: number;
  dvPercent: number | null;
  presentCount: number;
  missingCount: number;
}

interface MacroBreakdown {
  fatKcal: number;
  carbsKcal: number;
  proteinKcal: number;
  fatPercent: number;
  carbsPercent: number;
  proteinPercent: number;
}

type DisplayMode = "total" | "perServing";

@Component({
  standalone: true,
  selector: "page-nutrition-calculator",
  templateUrl: "nutrition-calculator.page.html",
  styleUrls: ["nutrition-calculator.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
    IonSegment,
    IonSegmentButton,
    IonNote,
    IonBadge,
    InfoBlockComponent,
  ],
})
export class NutritionCalculatorPage implements OnInit, OnDestroy {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private serverActionsService = inject(ServerActionsService);
  private utilService = inject(UtilService);
  private router = inject(Router);
  private events = inject(EventService);
  private loadingService = inject(LoadingService);

  private presetRecipeIds: string[] = [];
  private reloadPending = false;

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  recipes: SelectedRecipe[] = [];
  private nutritionById = new Map<string, RecipeSummary>();

  loadingRecipes = false;
  displayMode: DisplayMode = "total";
  bulkServings = 1;
  divideAmong = 1;
  private divideAmongTouched = false;

  fields: AggregateField[] = [];
  macros: MacroBreakdown | null = null;
  totalServings = 0;
  nutrientsPresentCount = 0;
  totalNutrientCount = NUTRITION_FIELDS.length;
  recipesWithDataCount = 0;

  constructor() {
    addIcons({
      add,
      fitness,
      pricetag,
      removeCircle,
      remove,
    });

    const state = this.router.getCurrentNavigation()?.extras.state;
    const rawRecipeIds = state?.["recipeIds"];
    if (Array.isArray(rawRecipeIds)) {
      for (const id of rawRecipeIds) {
        if (typeof id === "string") this.presetRecipeIds.push(id);
      }
    }

    this.events.subscribe(
      [EventName.RecipeUpdated, EventName.RecipeDeleted],
      this.setReloadPending,
    );
  }

  async ngOnInit() {
    if (this.presetRecipeIds.length) {
      await this.loadPresetRecipes(this.presetRecipeIds);
    }
  }

  ngOnDestroy() {
    this.events.unsubscribe(
      [EventName.RecipeUpdated, EventName.RecipeDeleted],
      this.setReloadPending,
    );
  }

  async ionViewWillEnter() {
    if (this.reloadPending && this.recipes.length) {
      const loading = this.loadingService.start();
      try {
        await this.reloadCachedRecipes();
      } finally {
        loading.dismiss();
      }
    }
    this.reloadPending = false;
  }

  private setReloadPending = () => {
    this.reloadPending = true;
  };

  private async reloadCachedRecipes() {
    this.loadingRecipes = true;

    const ids = this.recipes.map((recipe) => recipe.id);
    for (const id of ids) {
      this.nutritionById.delete(id);
    }

    await this.fetchNutritionForIds(ids);

    this.recipes = this.recipes.filter((recipe) =>
      this.nutritionById.has(recipe.id),
    );

    this.loadingRecipes = false;
    this.recompute();
  }

  private async loadPresetRecipes(ids: string[]) {
    this.loadingRecipes = true;

    const counts = new Map<string, number>();
    const order: string[] = [];
    for (const id of ids) {
      if (!counts.has(id)) order.push(id);
      counts.set(id, (counts.get(id) || 0) + 1);
    }

    await this.fetchNutritionForIds(order);

    const newRecipes: SelectedRecipe[] = [];
    for (const id of order) {
      const nutrition = this.nutritionById.get(id);
      if (!nutrition) continue;
      newRecipes.push({
        id,
        title: nutrition.title,
        servings: counts.get(id) || 1,
        servingSize: nutrition.nutritionServingSize,
      });
    }

    this.addRecipes(newRecipes);
    this.loadingRecipes = false;
    this.recompute();
  }

  goToTools() {
    this.navCtrl.navigateForward(RouteMap.ToolsPage.getPath());
  }

  recipeHref(recipe: SelectedRecipe): string {
    return `/app${RouteMap.RecipePage.getPath(recipe.id)}`;
  }

  openRecipe(recipe: SelectedRecipe, event: MouseEvent) {
    event.preventDefault();
    this.utilService.openRecipe(this.navCtrl, recipe.id, event);
  }

  async addRecipe() {
    const modal = await this.modalCtrl.create({
      component: SelectRecipeModalComponent,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<RecipeSummary>();
    if (!data) return;
    this.nutritionById.set(data.id, data);
    this.addRecipes([
      {
        id: data.id,
        title: data.title,
        servings: 1,
        servingSize: data.nutritionServingSize,
      },
    ]);
    this.recompute();
  }

  async addLabel() {
    const modal = await this.modalCtrl.create({
      component: SelectLabelModalComponent,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<LabelSummary>();
    if (!data) return;
    await this.addRecipesFromLabel(data.title);
  }

  private async addRecipesFromLabel(labelTitle: string) {
    this.loadingRecipes = true;

    const collected = new Map<string, SelectedRecipe>();
    let offset = 0;
    while (true) {
      const response = await this.serverActionsService.recipes.getRecipes({
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset,
        limit: RECIPE_PAGE_SIZE,
        labels: [labelTitle],
      });
      if (!response) break;

      for (const recipe of response.recipes) {
        collected.set(recipe.id, {
          id: recipe.id,
          title: recipe.title,
          servings: 1,
          servingSize: null,
        });
      }
      offset += response.recipes.length;

      if (response.recipes.length === 0 || offset >= response.totalCount) {
        break;
      }
    }

    this.addRecipes([...collected.values()]);
    await this.fetchMissingNutrition();

    this.loadingRecipes = false;
    this.recompute();
  }

  private addRecipes(newRecipes: SelectedRecipe[]) {
    const existingIds = new Set(this.recipes.map((recipe) => recipe.id));
    for (const recipe of newRecipes) {
      if (existingIds.has(recipe.id)) continue;
      existingIds.add(recipe.id);
      this.recipes.push(recipe);
    }
  }

  private async fetchNutritionForIds(ids: string[]) {
    const missingIds = ids.filter((id) => !this.nutritionById.has(id));

    for (let i = 0; i < missingIds.length; i += FETCH_CHUNK_SIZE) {
      const chunk = missingIds.slice(i, i + FETCH_CHUNK_SIZE);
      const response = await this.serverActionsService.recipes.getRecipesByIds({
        ids: chunk,
      });
      if (!response) continue;
      for (const recipe of response) {
        this.nutritionById.set(recipe.id, recipe);
      }
    }
  }

  private async fetchMissingNutrition() {
    await this.fetchNutritionForIds(this.recipes.map((recipe) => recipe.id));

    for (const recipe of this.recipes) {
      const nutrition = this.nutritionById.get(recipe.id);
      if (nutrition && recipe.servingSize === null) {
        recipe.servingSize = nutrition.nutritionServingSize;
      }
    }
  }

  removeRecipe(recipe: SelectedRecipe) {
    this.recipes = this.recipes.filter((item) => item.id !== recipe.id);
    this.recompute();
  }

  private clampServingsValue(value: number, min: number): number {
    if (!Number.isFinite(value)) return min;
    const clamped = Math.min(MAX_SERVINGS, Math.max(min, value));
    return Math.round(clamped * 100) / 100;
  }

  clampServings(recipe: SelectedRecipe) {
    recipe.servings = this.clampServingsValue(Number(recipe.servings), 0);
    this.recompute();
  }

  stepServings(recipe: SelectedRecipe, delta: number) {
    recipe.servings = this.clampServingsValue(
      (Number(recipe.servings) || 0) + delta,
      0,
    );
    this.recompute();
  }

  onBulkServingsInput() {
    const raw = Number(this.bulkServings);
    if (!Number.isFinite(raw)) return;
    const value = this.clampServingsValue(raw, 0);
    for (const recipe of this.recipes) {
      recipe.servings = value;
    }
    this.recompute();
  }

  clampBulkServings() {
    const value = this.clampServingsValue(Number(this.bulkServings) || 0, 0);
    this.bulkServings = value;
    for (const recipe of this.recipes) {
      recipe.servings = value;
    }
    this.recompute();
  }

  stepBulkServings(delta: number) {
    const value = this.clampServingsValue(
      (Number(this.bulkServings) || 0) + delta,
      0,
    );
    this.bulkServings = value;
    for (const recipe of this.recipes) {
      recipe.servings = value;
    }
    this.recompute();
  }

  refresh() {
    this.recompute();
  }

  averageDivisor(): number {
    const value = Number(this.divideAmong);
    if (!Number.isFinite(value) || value <= 0) return 1;
    const clamped = this.clampServingsValue(value, 0);
    return clamped > 0 ? clamped : 1;
  }

  onDivideAmongInput() {
    this.divideAmongTouched = true;
    this.recompute();
  }

  clampDivideAmong() {
    this.divideAmongTouched = true;
    this.divideAmong = this.averageDivisor();
    this.recompute();
  }

  hasResults() {
    return this.fields.length > 0;
  }

  private recompute() {
    const recipeCount = this.recipes.length;
    this.totalServings = this.recipes.reduce(
      (acc, recipe) => acc + (recipe.servings || 0),
      0,
    );

    if (!this.divideAmongTouched) {
      this.divideAmong = this.totalServings || 1;
    }
    const divisor = this.averageDivisor();

    const fields: AggregateField[] = [];
    for (const def of NUTRITION_FIELDS) {
      let sum = 0;
      let presentCount = 0;
      for (const recipe of this.recipes) {
        const nutrition = this.nutritionById.get(recipe.id);
        const value = nutrition ? nutrition[def.key] : null;
        if (value === null || value === undefined) continue;
        sum += value * (recipe.servings || 0);
        presentCount += 1;
      }

      if (presentCount === 0) continue;

      const displayed = this.displayMode === "perServing" ? sum / divisor : sum;

      const dv = DAILY_VALUES[def.key];
      const dvPercent =
        dv !== undefined && dv > 0 ? Math.round((displayed / dv) * 100) : null;

      fields.push({
        key: def.key,
        unit: def.unit,
        indent: def.indent ?? false,
        value: this.round(displayed),
        dvPercent,
        presentCount,
        missingCount: recipeCount - presentCount,
      });
    }

    this.fields = fields;
    this.macros = this.computeMacros();
    this.nutrientsPresentCount = fields.length;
    this.recipesWithDataCount = this.recipes.filter((recipe) =>
      this.recipeHasNutrition(recipe.id),
    ).length;
  }

  private computeMacros(): MacroBreakdown | null {
    const fat = this.fields.find((field) => field.key === "nutritionTotalFat");
    const carbs = this.fields.find(
      (field) => field.key === "nutritionTotalCarbs",
    );
    const protein = this.fields.find(
      (field) => field.key === "nutritionProtein",
    );

    if (!fat && !carbs && !protein) return null;

    const fatKcal = (fat?.value ?? 0) * 9;
    const carbsKcal = (carbs?.value ?? 0) * 4;
    const proteinKcal = (protein?.value ?? 0) * 4;
    const total = fatKcal + carbsKcal + proteinKcal;
    if (total <= 0) return null;

    return {
      fatKcal: this.round(fatKcal),
      carbsKcal: this.round(carbsKcal),
      proteinKcal: this.round(proteinKcal),
      fatPercent: Math.round((fatKcal / total) * 100),
      carbsPercent: Math.round((carbsKcal / total) * 100),
      proteinPercent: Math.round((proteinKcal / total) * 100),
    };
  }

  recipeHasNoNutrition(recipe: SelectedRecipe): boolean {
    return (
      this.nutritionById.has(recipe.id) && !this.recipeHasNutrition(recipe.id)
    );
  }

  private recipeHasNutrition(id: string): boolean {
    const nutrition = this.nutritionById.get(id);
    if (!nutrition) return false;
    return NUTRITION_FIELDS.some((def) => {
      const value = nutrition[def.key];
      return value !== null && value !== undefined;
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
