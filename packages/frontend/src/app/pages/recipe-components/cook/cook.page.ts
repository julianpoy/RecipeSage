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
  parseInstructions,
  parseNotes,
} from "@recipesage/util/shared";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";
import {
  ScaleRecipeComponent,
  type UnitSystem,
} from "../../../modals/scale-recipe/scale-recipe.component";
import { System } from "unitz-ts";
import type { RecipeSummary } from "@recipesage/prisma";
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
import { close } from "ionicons/icons";
import { addIcons } from "ionicons";

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
  recipe: RecipeSummary | null = null;
  recipeId = "";
  ingredients?: ParsedIngredient[];
  instructions?: ParsedInstruction[];
  notes?: ParsedNote[];
  scale = "1";
  unitSystem: UnitSystem = "original";

  constructor() {
    addIcons({ close });
    this.applyRouteParams();
  }

  private applyRouteParams() {
    const recipeId = this.route.snapshot.paramMap.get("recipeId");
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
    const snapshotRecipeId = this.route.snapshot.paramMap.get("recipeId");
    if (snapshotRecipeId && snapshotRecipeId !== this.recipeId) {
      this.applyRouteParams();
    }

    this.recipe = null;
    this.load();

    this.setupWakeLock();
    this.applyCookFontSize();
  }

  ionViewWillLeave() {
    this.releaseWakeLock();
    this.restoreFontSize();
    this.fullscreenService.exit();
  }

  async load() {
    this.loading = true;
    const response = await this.serverActionsService.recipes.getRecipe({
      id: this.recipeId,
    });
    this.loading = false;
    if (!response) return;

    this.recipe = response;

    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: this.recipe.title,
      })
      .toPromise();
    this.titleService.setTitle(title);

    this.applyScale();
  }

  applyScale() {
    if (!this.recipe) return;

    const targetSystem =
      this.unitSystem === "metric"
        ? System.METRIC
        : this.unitSystem === "imperial"
          ? System.US
          : undefined;

    this.ingredients = parseIngredients(
      this.recipe.ingredients,
      this.scale,
      targetSystem,
    );
    this.instructions = parseInstructions(
      this.recipe.instructions,
      this.scale,
      targetSystem,
      this.getInlineImageRefs(),
    );
    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = parseNotes(
        this.recipe.notes,
        this.scale,
        targetSystem,
        this.getInlineImageRefs(),
      ).map((note) => ({
        ...note,
        htmlContent: linkifyHtml(note.htmlContent),
      }));
    }
  }

  private getInlineImageRefs(): { url: string }[] {
    if (!this.recipe) return [];
    return [...this.recipe.recipeImages]
      .sort((a, b) => a.order - b.order)
      .map((ri) => ({ url: ri.image.location }));
  }

  async changeScale() {
    const modal = await this.modalCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale.toString(),
        unitSystem: this.unitSystem,
        yieldText: this.recipe?.yield ?? null,
        ingredients: this.ingredients ?? [],
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
    this.navCtrl.navigateBack(RouteMap.RecipePage.getPath(this.recipeId));
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
