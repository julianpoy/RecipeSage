import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController, ModalController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { linkifyHtml } from "../../../utils/linkify";
import { UtilService, RouteMap } from "../../../services/util.service";
import { WakeLockService } from "../../../services/wakelock.service";
import { FullscreenService } from "../../../services/fullscreen.service";
import { PreferencesService } from "../../../services/preferences.service";
import {
  CookModePreferenceKey,
  GlobalPreferenceKey,
  ParsedInstruction,
  ParsedIngredient,
  ParsedNote,
  parseIngredients,
  inferRecipeNotation,
  applyDecimalNotation,
  type DecimalNotation,
  parseInstructions,
  parseNotes,
} from "@recipesage/util/shared";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";
import {
  ScaleRecipeComponent,
  type UnitSystem,
} from "../../../modals/scale-recipe/scale-recipe.component";
import { System } from "unitz-ts";
import { ServerActionsService } from "../../../services/server-actions.service";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonSpinner,
  IonLabel,
} from "@ionic/angular/standalone";
import { alertCircleOutline, closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

interface CookableRecipe {
  title: string;
  yield: string;
  ingredients: string;
  instructions: string;
  notes: string;
  images: { location: string; order: number }[];
}

@Component({
  standalone: true,
  selector: "page-cook",
  templateUrl: "cook.page.html",
  styleUrls: ["cook.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSpinner,
    IonLabel,
  ],
})
export class CookPage {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private route = inject(ActivatedRoute);
  private wakeLockService = inject(WakeLockService);
  private fullscreenService = inject(FullscreenService);
  private preferencesService = inject(PreferencesService);
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );
  private serverActionsService = inject(ServerActionsService);
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  utilService = inject(UtilService);

  wakeLockRequest: null | {
    release: () => void;
  } = null;

  loading = true;
  notFound = false;
  recipe: CookableRecipe | null = null;
  isDiscover = false;
  recipeId = "";
  ingredients?: ParsedIngredient[];
  instructions?: ParsedInstruction[];
  notes?: ParsedNote[];
  scale = "1";
  decimalNotationMode: DecimalNotation = ".";
  unitSystem: UnitSystem = "original";

  constructor() {
    addIcons({ alertCircleOutline, closeOutline });
    this.applyRouteParams();
  }

  private get routeParamName() {
    return this.route.snapshot.data["isDiscover"]
      ? "discoverRecipeId"
      : "recipeId";
  }

  private applyRouteParams() {
    this.isDiscover = !!this.route.snapshot.data["isDiscover"];
    const recipeId = this.route.snapshot.paramMap.get(this.routeParamName);
    if (!recipeId) {
      this.navCtrl.navigateBack(RouteMap.HomePage.getPath("main"));
      throw new Error("No recipeId was provided");
    }
    this.recipeId = recipeId;
    this.scale = this.recipeCompletionTrackerService.getRecipeScale(
      this.recipeId,
    );
  }

  ionViewWillEnter() {
    this.recipe = null;
    this.ingredients = undefined;
    this.instructions = undefined;
    this.notes = undefined;
    this.load();

    this.setupWakeLock();
    this.applyCookFontSize();
  }

  ionViewWillLeave() {
    this.releaseWakeLock();
    this.restoreFontSize();
    this.fullscreenService.exit();
  }

  backToRecipes() {
    this.navCtrl.navigateBack(RouteMap.HomePage.getPath("main"));
  }

  async load() {
    this.loading = true;
    this.notFound = false;
    const recipe = this.isDiscover
      ? await this.loadDiscoverRecipe()
      : await this.loadRecipe();

    this.recipe = recipe;
    this.loading = false;
    if (!this.recipe) return;

    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: this.recipe.title,
      })
      .toPromise();
    this.titleService.setTitle(title);

    this.applyScale();
  }

  private async loadRecipe(): Promise<CookableRecipe | null> {
    const response = await this.serverActionsService.recipes.getRecipe(
      {
        id: this.recipeId,
      },
      {
        404: () => (this.notFound = true),
      },
    );
    if (!response) return null;

    return {
      title: response.title,
      yield: response.yield,
      ingredients: response.ingredients,
      instructions: response.instructions,
      notes: response.notes,
      images: response.recipeImages.map((recipeImage) => ({
        location: recipeImage.image.location,
        order: recipeImage.order,
      })),
    };
  }

  private async loadDiscoverRecipe(): Promise<CookableRecipe | null> {
    const response = await this.serverActionsService.discover.getDiscoverRecipe(
      {
        id: this.recipeId,
      },
      {
        404: () => (this.notFound = true),
      },
    );
    if (!response) return null;

    return {
      title: response.title,
      yield: response.yield,
      ingredients: response.ingredients,
      instructions: response.instructions,
      notes: response.notes,
      images: response.discoverRecipeImages.map((discoverRecipeImage) => ({
        location: discoverRecipeImage.image.location,
        order: discoverRecipeImage.order,
      })),
    };
  }

  get scaleDisplay(): string {
    return applyDecimalNotation(this.scale, this.decimalNotationMode);
  }

  applyScale() {
    if (!this.recipe) return;

    const targetSystem =
      this.unitSystem === "metric"
        ? System.METRIC
        : this.unitSystem === "imperial"
          ? System.US
          : undefined;

    const decimalNotationMode = inferRecipeNotation(
      this.recipe,
      this.translate.getCurrentLang(),
    );
    this.decimalNotationMode = decimalNotationMode;

    this.ingredients = parseIngredients(this.recipe.ingredients, this.scale, {
      targetSystem,
      decimalNotationMode,
    });
    this.instructions = parseInstructions(
      this.recipe.instructions,
      this.scale,
      { targetSystem, decimalNotationMode, images: this.getInlineImageRefs() },
    );
    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = parseNotes(this.recipe.notes, this.scale, {
        targetSystem,
        decimalNotationMode,
        images: this.getInlineImageRefs(),
      }).map((note) => ({
        ...note,
        htmlContent: linkifyHtml(note.htmlContent),
      }));
    } else {
      this.notes = undefined;
    }
  }

  private getInlineImageRefs(): { url: string }[] {
    if (!this.recipe) return [];
    return [...this.recipe.images]
      .sort((a, b) => a.order - b.order)
      .map((image) => ({ url: image.location }));
  }

  async changeScale() {
    const modal = await this.modalCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale.toString(),
        unitSystem: this.unitSystem,
        yieldText: this.recipe?.yield ?? null,
        ingredients: this.ingredients ?? [],
        decimalNotationMode: this.decimalNotationMode,
      },
      cssClass: "scaleRecipeModal",
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (!data) return;

    if (data.scale) {
      this.scale = data.scale;
      this.recipeCompletionTrackerService.setRecipeScale(
        this.recipeId,
        this.scale,
      );
    }
    if (data.unitSystem) {
      this.unitSystem = data.unitSystem;
    }
    this.applyScale();
  }

  instructionClicked(_: Event, instruction: ParsedInstruction, idx: number) {
    if (instruction.isHeader) return;

    this.recipeCompletionTrackerService.toggleInstructionComplete(
      this.recipeId,
      idx,
    );
  }

  ingredientClicked(_: Event, ingredient: ParsedIngredient, idx: number) {
    if (ingredient.isHeader) return;

    this.recipeCompletionTrackerService.toggleIngredientComplete(
      this.recipeId,
      idx,
    );
  }

  getInstructionComplete(idx: number) {
    return this.recipeCompletionTrackerService.getInstructionComplete(
      this.recipeId,
      idx,
    );
  }

  getIngredientComplete(idx: number) {
    return this.recipeCompletionTrackerService.getIngredientComplete(
      this.recipeId,
      idx,
    );
  }

  exitCookMode() {
    this.navCtrl.navigateBack(
      this.isDiscover
        ? RouteMap.DiscoverRecipePage.getPath(this.recipeId)
        : RouteMap.RecipePage.getPath(this.recipeId),
    );
  }

  setupWakeLock() {
    if (!this.wakeLockRequest) {
      this.wakeLockService.request().then((wl) => (this.wakeLockRequest = wl));
    }
  }

  releaseWakeLock() {
    if (this.wakeLockRequest) this.wakeLockRequest.release();
    this.wakeLockRequest = null;
  }

  applyCookFontSize() {
    this.utilService.setFontSize(
      this.preferencesService.preferences[CookModePreferenceKey.FontSize],
    );
  }

  restoreFontSize() {
    this.utilService.setFontSize(
      this.preferencesService.preferences[GlobalPreferenceKey.FontSize],
    );
  }
}
