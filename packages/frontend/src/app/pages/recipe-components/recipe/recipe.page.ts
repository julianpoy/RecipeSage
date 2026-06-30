import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  AlertController,
  ToastController,
  ModalController,
  PopoverController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import dayjs from "dayjs";

import { linkifyHtml } from "../../../utils/linkify";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import { LoadingService } from "../../../services/loading.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { WakeLockService } from "../../../services/wakelock.service";
import { FullscreenService } from "../../../services/fullscreen.service";
import { PreferencesService } from "../../../services/preferences.service";
import {
  RecipeDetailsPreferenceKey,
  ParsedInstruction,
  ParsedIngredient,
  ParsedNote,
  parseIngredients,
  parseInstructions,
  parseNotes,
} from "@recipesage/util/shared";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";

import { AddRecipeToShoppingListModalPage } from "../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";
import { AddRecipeToMealPlanModalPage } from "../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page";
import { PrintRecipeModalPage } from "../print-recipe-modal/print-recipe-modal.page";
import {
  RecipeDetailsPopoverPage,
  type RecipeDetailsPopoverActionTypes,
} from "../recipe-details-popover/recipe-details-popover.page";
import { ShareModalPage } from "../../share-modal/share-modal.page";
import { AuthPage } from "../../auth/auth.page";
import { ImageViewerComponent } from "../../../modals/image-viewer/image-viewer.component";
import {
  ScaleRecipeComponent,
  type UnitSystem,
} from "../../../modals/scale-recipe/scale-recipe.component";
import { System } from "unitz-ts";
import type { RecipeSummary, RecipeSummaryLite } from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonAvatar,
  IonChip,
} from "@ionic/angular/standalone";
import {
  bookOutline,
  calendarOutline,
  cloudDownloadOutline,
  copyOutline,
  createOutline,
  documentTextOutline,
  fitnessOutline,
  flashlightOutline,
  linkOutline,
  listOutline,
  optionsOutline,
  pinOutline,
  pricetagOutline,
  printOutline,
  shareOutline,
  trashOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-recipe",
  templateUrl: "recipe.page.html",
  styleUrls: ["recipe.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    RatingComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonAvatar,
    IonChip,
  ],
})
export class RecipePage {
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private popoverCtrl = inject(PopoverController);
  private loadingService = inject(LoadingService);
  private preferencesService = inject(PreferencesService);
  private wakeLockService = inject(WakeLockService);
  private fullscreenService = inject(FullscreenService);
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );
  private route = inject(ActivatedRoute);
  utilService = inject(UtilService);
  cookingToolbarService = inject(CookingToolbarService);
  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);
  private titleService = inject(Title);

  defaultBackHref: string = RouteMap.HomePage.getPath("main");

  wakeLockRequest: null | {
    release: () => void;
  } = null;

  private meQuery = this.serverActionsService.users.getMe({ 401: () => {} });
  me = this.meQuery.value;
  recipe: RecipeSummary | null = null;
  similarRecipes: RecipeSummaryLite[] = [];
  linkedRecipes: Array<{
    id: string;
    title: string;
    recipeImages: Array<{ image: { location: string } }>;
  }> = [];
  recipeId: string = "";
  ingredients?: ParsedIngredient[];
  instructions?: ParsedInstruction[];
  notes?: ParsedNote[];
  scale: string = "1";
  unitSystem: UnitSystem = "original";

  labelGroupIds: string[] = [];
  labelGroupById: Record<
    string,
    NonNullable<RecipeSummary["recipeLabels"][0]["label"]["labelGroup"]>
  > = {};

  ratingVisual = new Array<string>(5).fill("star-outline");

  isLoggedIn: boolean = !!localStorage.getItem("token");

  hasNutrition(): boolean {
    return [
      this.recipe?.nutritionServingSize,
      this.recipe?.nutritionCalories,
      this.recipe?.nutritionTotalFat,
      this.recipe?.nutritionSaturatedFat,
      this.recipe?.nutritionTransFat,
      this.recipe?.nutritionPolyunsaturatedFat,
      this.recipe?.nutritionMonounsaturatedFat,
      this.recipe?.nutritionCholesterol,
      this.recipe?.nutritionSodium,
      this.recipe?.nutritionTotalCarbs,
      this.recipe?.nutritionDietaryFiber,
      this.recipe?.nutritionTotalSugars,
      this.recipe?.nutritionAddedSugars,
      this.recipe?.nutritionProtein,
      this.recipe?.nutritionVitaminD,
      this.recipe?.nutritionCalcium,
      this.recipe?.nutritionIron,
      this.recipe?.nutritionPotassium,
      this.recipe?.nutritionOtherDetails,
    ].some((v) => v != null && v !== "");
  }

  constructor() {
    addIcons({
      bookOutline,
      calendarOutline,
      cloudDownloadOutline,
      copyOutline,
      createOutline,
      documentTextOutline,
      fitnessOutline,
      flashlightOutline,
      linkOutline,
      listOutline,
      optionsOutline,
      pinOutline,
      pricetagOutline,
      printOutline,
      shareOutline,
      trashOutline,
    });
    this.updateIsLoggedIn();
    this.applyRouteParams();
    this.applyScale();
  }

  private applyRouteParams() {
    const recipeId = this.route.snapshot.paramMap.get("recipeId");
    if (!recipeId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("No recipeId was provided");
    }
    this.recipeId = recipeId;
    this.scale =
      this.recipeCompletionTrackerService.getRecipeScale(this.recipeId) || "1";
  }

  ionViewWillEnter() {
    const snapshotRecipeId = this.route.snapshot.paramMap.get("recipeId");
    if (snapshotRecipeId && snapshotRecipeId !== this.recipeId) {
      this.applyRouteParams();
    }

    this.recipe = null;
    this.similarRecipes = [];
    this.linkedRecipes = [];

    this.loadWithBar();

    this.setupWakeLock();
  }

  async loadWithBar() {
    const loading = this.loadingService.start();
    await this.load();
    loading.dismiss();
  }

  ionViewWillLeave() {
    this.releaseWakeLock();
  }

  updateIsLoggedIn() {
    this.isLoggedIn = !!localStorage.getItem("token");
  }

  async load() {
    return Promise.all([this._loadRecipe(), this._loadSimilarRecipes()]);
  }

  async _loadRecipe() {
    const response = await this.serverActionsService.recipes.getRecipe({
      id: this.recipeId,
    });
    if (!response) return;

    this.recipe = response;
    if (this.recipe && "recipeLinks" in this.recipe) {
      const recipeWithLinks = this.recipe as typeof this.recipe & {
        recipeLinks: Array<{
          linkedRecipe: {
            id: string;
            title: string;
            recipeImages: Array<{ image: { location: string } }>;
          };
        }>;
      };
      this.linkedRecipes = recipeWithLinks.recipeLinks.map(
        (link) => link.linkedRecipe,
      );
    }
    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: this.recipe.title,
      })
      .toPromise();
    this.titleService.setTitle(title);

    if (this.recipe.url && !this.recipe.url.trim().startsWith("http")) {
      this.recipe.url = "http://" + this.recipe.url.trim();
    }

    const groupIdsSet = new Set<string>();
    for (const recipeLabel of this.recipe.recipeLabels) {
      const labelGroup = recipeLabel.label.labelGroup;
      if (labelGroup) {
        groupIdsSet.add(labelGroup.id);
        this.labelGroupById[labelGroup.id] = labelGroup;
      }
    }
    this.labelGroupIds = Array.from(groupIdsSet).sort((a, b) =>
      this.labelGroupById[a].title.localeCompare(this.labelGroupById[b].title),
    );

    this.applyScale();

    this.updateRatingVisual();
  }

  recipeLabelsForGroupId(labelGroupId: string | null) {
    if (!this.recipe) return [];

    return this.recipe.recipeLabels
      .filter((recipeLabel) => recipeLabel.label.labelGroupId === labelGroupId)
      .sort((a, b) => a.label.title.localeCompare(b.label.title));
  }

  get isOwner() {
    return !!this.recipe && this.recipe.userId === this.me()?.id;
  }

  openLabel(labelTitle: string) {
    if (!this.isOwner) return;

    this.navCtrl.navigateForward(
      RouteMap.HomePage.getPath("main", { selectedLabels: [labelTitle] }),
      {
        state: {
          showBack: true,
        },
      },
    );
  }

  async _loadSimilarRecipes() {
    if (!this.isLoggedIn) return;

    const response = await this.serverActionsService.recipes.getSimilarRecipes({
      recipeIds: [this.recipeId],
    });
    if (!response) return;

    for (const el of response) {
      el.recipeImages = el.recipeImages.sort((a, b) => {
        return a.order - b.order;
      });
    }
    this.similarRecipes = response;
  }

  updateRatingVisual() {
    if (!this.recipe) return;

    this.ratingVisual = new Array<string>(5)
      .fill("star", 0, this.recipe.rating || 0)
      .fill("star-outline", this.recipe.rating || 0, 5);
  }

  async presentPopover(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: RecipeDetailsPopoverPage,
      componentProps: {
        recipe: this.recipe,
        me: this.me(),
        isLoggedIn: this.isLoggedIn,
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (!data || !data.action) return;
    const action = data.action as RecipeDetailsPopoverActionTypes;
    switch (action) {
      case "updateWakeLock":
        const wlEnabled =
          this.preferencesService.preferences[
            RecipeDetailsPreferenceKey.EnableWakeLock
          ];
        return wlEnabled ? this.setupWakeLock() : this.releaseWakeLock();
      case "enterCookMode":
        return this.enterCookMode();
      case "addToShoppingList":
        return this.addRecipeToShoppingList();
      case "addToMealPlan":
        return this.addRecipeToMealPlan();
      case "share":
        return this.shareRecipe();
      case "print":
        return this.printRecipe();
      case "unpin":
        return this.unpinRecipe();
      case "pin":
        return this.pinRecipe();
      case "edit":
        return this.editRecipe();
      case "clone":
        return this.cloneRecipe();
      case "authAndClone":
        return this.authAndClone();
      case "moveToMain":
        return this.moveToFolder("main");
      case "delete":
        return this.deleteRecipe();
      case "setLastMadeToday":
        return this.setLastMadeToday();
      case "publishToDiscover":
        return this.publishToDiscover();
      default:
        const exhaustiveCheck: never = action;
        throw new Error(`Unhandled action case: ${exhaustiveCheck}`);
    }
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

  editRecipe() {
    this.navCtrl.navigateForward(
      RouteMap.EditRecipePage.getPath(this.recipeId),
    );
  }

  async publishToDiscover() {
    if (!this.recipe) return;

    if (this.recipe.source?.trim() || this.recipe.url?.trim()) {
      const header = await this.translate
        .get("pages.publishDiscoverRecipe.ineligible.header")
        .toPromise();
      const message = await this.translate
        .get("pages.publishDiscoverRecipe.ineligible.message")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: okay,
            role: "cancel",
          },
        ],
      });
      alert.present();
      return;
    }

    this.navCtrl.navigateForward(
      RouteMap.PublishDiscoverRecipePage.getPath(this.recipe.id),
    );
  }

  async deleteRecipe() {
    const header = await this.translate
      .get("pages.recipeDetails.delete.header")
      .toPromise();
    const message = await this.translate
      .get("pages.recipeDetails.delete.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: () => {
            this._deleteRecipe();
          },
        },
      ],
    });
    alert.present();
  }

  private async _deleteRecipe() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const response = await this.serverActionsService.recipes.deleteRecipe({
      id: this.recipe.id,
    });

    loading.dismiss();
    if (!response) return;

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath(this.recipe.folder));
  }

  async setLastMadeToday() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const lastMadeAt = dayjs().format("YYYY-MM-DD");

    const response = await this.serverActionsService.recipes.updateRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      description: this.recipe.description,
      yield: this.recipe.yield,
      activeTime: this.recipe.activeTime,
      totalTime: this.recipe.totalTime,
      source: this.recipe.source,
      url: this.recipe.url,
      notes: this.recipe.notes,
      ingredients: this.recipe.ingredients,
      instructions: this.recipe.instructions,
      rating: this.recipe.rating,
      folder: this.recipe.folder as "main" | "inbox",
      imageIds: this.recipe.recipeImages.map((ri) => ri.image.id),
      labelIds: this.recipe.recipeLabels.map((rl) => rl.label.id),
      lastMadeAt,
    });

    loading.dismiss();

    if (!response) return;

    this.recipe.lastMadeAt = lastMadeAt;
    const message = await this.translate
      .get("pages.recipeDetails.lastMadeAtUpdated")
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
    });
    toast.present();
  }

  async addRecipeToShoppingList() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToShoppingListModalPage,
      componentProps: {
        recipes: [this.recipe],
        scale: this.scale,
      },
    });

    modal.present();
  }

  async addRecipeToMealPlan() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToMealPlanModalPage,
      componentProps: {
        recipe: this.recipe,
      },
    });

    modal.present();
  }

  async printRecipe() {
    const printRecipeModal = await this.modalCtrl.create({
      component: PrintRecipeModalPage,
      componentProps: {
        recipe: this.recipe,
        scale: this.scale,
      },
    });

    printRecipeModal.present();
  }

  async shareRecipe() {
    const shareModal = await this.modalCtrl.create({
      component: ShareModalPage,
      componentProps: {
        recipe: this.recipe,
      },
    });
    shareModal.present();
  }

  async moveToFolder(folderName: "main" | "inbox") {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const response = await this.serverActionsService.recipes.updateRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      description: this.recipe.description,
      yield: this.recipe.yield,
      activeTime: this.recipe.activeTime,
      totalTime: this.recipe.totalTime,
      source: this.recipe.source,
      url: this.recipe.url,
      notes: this.recipe.notes,
      ingredients: this.recipe.ingredients,
      instructions: this.recipe.instructions,
      rating: this.recipe.rating,
      folder: folderName,
      labelIds: this.recipe.recipeLabels.map(
        (recipeLabel) => recipeLabel.label.id,
      ),
      imageIds: this.recipe.recipeImages.map(
        (recipeImage) => recipeImage.imageId,
      ),
    });

    loading.dismiss();
    if (!response) return;

    window.location.reload();
  }

  async cloneRecipe() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const labelIds =
      this.me()?.id === this.recipe.id
        ? this.recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.id)
        : [];

    const response = await this.serverActionsService.recipes.createRecipe({
      title: this.recipe.title,
      description: this.recipe.description,
      yield: this.recipe.yield,
      activeTime: this.recipe.activeTime,
      totalTime: this.recipe.totalTime,
      source: this.recipe.source,
      url: this.recipe.url,
      notes: this.recipe.notes,
      ingredients: this.recipe.ingredients,
      instructions: this.recipe.instructions,
      rating: this.recipe.rating,
      folder: this.recipe.folder as "main" | "inbox",
      labelIds,
      imageIds: this.recipe.recipeImages.map(
        (recipeImage) => recipeImage.imageId,
      ),
    });

    loading.dismiss();
    if (!response) return false;

    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(response.id));

    return true;
  }

  async goToAuth(cb?: () => any) {
    const authModal = await this.modalCtrl.create({
      component: AuthPage,
      componentProps: {
        startWithRegister: !this.isLoggedIn,
      },
    });
    authModal.onDidDismiss().then(() => {
      this.updateIsLoggedIn();
      if (cb) cb();
    });
    authModal.present();
  }

  authAndClone() {
    this.goToAuth(() => {
      this.cloneRecipe().then(async (success) => {
        if (!success) return;

        const message = await this.translate
          .get("pages.recipeDetails.cloned")
          .toPromise();
        (
          await this.toastCtrl.create({
            message,
            duration: 5000,
          })
        ).present();
      });
    });
  }

  prettyDateTime(datetime: Date | string | number) {
    if (!datetime) return "";
    return this.utilService.formatDate(datetime, { times: true });
  }

  formatDate(date: Date | string | number) {
    if (!date) return "";
    return this.utilService.formatDate(date, { times: false });
  }

  sortedRecipeImages() {
    return this.recipe?.recipeImages.sort((a, b) => a.order - b.order) || [];
  }

  async openImageViewer() {
    if (!this.recipe) return;

    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.sortedRecipeImages().map(
          (recipeImage) => recipeImage.image.location,
        ),
      },
    });
    imageViewerModal.present();
  }

  pinRecipe() {
    if (!this.recipe) return;

    this.cookingToolbarService.pinRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      imageUrl: this.sortedRecipeImages()[0]?.image.location || undefined,
    });
  }

  unpinRecipe() {
    if (!this.recipe) return;

    this.cookingToolbarService.unpinRecipe(this.recipe.id);
  }

  openRecipe(recipeId: string, event?: MouseEvent | KeyboardEvent) {
    this.utilService.openRecipe(this.navCtrl, recipeId, event);
  }

  async enterCookMode() {
    await this.fullscreenService.request();
    this.navCtrl.navigateForward(
      RouteMap.RecipePageCook.getPath(this.recipeId),
    );
  }

  setupWakeLock() {
    if (
      !this.wakeLockRequest &&
      this.preferencesService.preferences[
        RecipeDetailsPreferenceKey.EnableWakeLock
      ]
    ) {
      this.wakeLockService.request().then((wl) => (this.wakeLockRequest = wl));
    }
  }

  releaseWakeLock() {
    if (this.wakeLockRequest) this.wakeLockRequest.release();
    this.wakeLockRequest = null;
  }

  recipeLabelTrackBy(_: number, recipeLabel: { id: string }) {
    return recipeLabel.id;
  }
}
