import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  AlertController,
  ToastController,
  ModalController,
  PopoverController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import dayjs from "dayjs";

import { linkifyHtml } from "~/utils/linkify";
import {
  RecipeService,
  ParsedInstruction,
  ParsedIngredient,
  ParsedNote,
  RecipeFolderName,
} from "~/services/recipe.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { WakeLockService } from "~/services/wakelock.service";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { RecipeCompletionTrackerService } from "~/services/recipe-completion-tracker.service";

import { AddRecipeToShoppingListModalPage } from "../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";
import { AddRecipeToMealPlanModalPage } from "../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page";
import { PrintRecipeModalPage } from "../print-recipe-modal/print-recipe-modal.page";
import {
  RecipeDetailsPopoverPage,
  type RecipeDetailsPopoverActionTypes,
} from "../recipe-details-popover/recipe-details-popover.page";
import { ShareModalPage } from "~/pages/share-modal/share-modal.page";
import { AuthPage } from "~/pages/auth/auth.page";
import { ImageViewerComponent } from "~/modals/image-viewer/image-viewer.component";
import { ScaleRecipeComponent } from "~/modals/scale-recipe/scale-recipe.component";
import {
  NutritionModalComponent,
  type NutritionInfo,
  type IngredientNutrition,
} from "~/modals/nutrition-modal/nutrition-modal.component";
import type {
  RecipeSummary,
  RecipeSummaryLite,
  UserPublic,
} from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";
import { Title } from "@angular/platform-browser";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";

@Component({
  standalone: true,
  selector: "page-recipe",
  templateUrl: "recipe.page.html",
  styleUrls: ["recipe.page.scss"],
  providers: [RecipeService],
  imports: [...SHARED_UI_IMPORTS, RatingComponent, NutritionModalComponent],
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
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );
  private route = inject(ActivatedRoute);
  utilService = inject(UtilService);
  private recipeService = inject(RecipeService);
  cookingToolbarService = inject(CookingToolbarService);
  private translate = inject(TranslateService);
  private trpcService = inject(TRPCService);
  private titleService = inject(Title);

  defaultBackHref: string = RouteMap.HomePage.getPath("main");

  wakeLockRequest: null | {
    release: () => void;
  } = null;

  me: UserPublic | null = null;
  recipe: RecipeSummary | null = null;
  similarRecipes: RecipeSummaryLite[] = [];
  linkedRecipes: Array<{
    id: string;
    title: string;
    recipeImages: Array<{ image: { location: string } }>;
  }> = [];
  recipeId: string;
  ingredients?: ParsedIngredient[];
  instructions?: ParsedInstruction[];
  notes?: ParsedNote[];
  scale = 1;

  labelGroupIds: string[] = [];
  labelGroupById: Record<
    string,
    NonNullable<RecipeSummary["recipeLabels"][0]["label"]["labelGroup"]>
  > = {};

  ratingVisual = new Array<string>(5).fill("star-outline");

  isLoggedIn: boolean = !!localStorage.getItem("token");

  // Mock nutrition data for frontend development
  // TODO: Replace with data from backend once schema is implemented
  mockNutrition: NutritionInfo | null = {
    servingSize: "4 fries",
    yield: "16 fries",
    calories: 330,
    carbs: 22,
    protein: 6,
    fat: 25,
    saturatedFat: 4,
    unsaturatedFat: 18,
    fiber: 5,
    sugar: 1,
    sodium: 620,
    cholesterol: 93,
  };

  mockIngredientNutrition: IngredientNutrition[] = [
    {
      name: "Avocados",
      quantity: "2 large",
      grams: 400,
      calories: 640,
      fat: 60,
      carbs: 36,
      protein: 8,
    },
    {
      name: "Panko bread crumbs",
      quantity: "3/4 cup",
      grams: 45,
      calories: 165,
      fat: 2,
      carbs: 33,
      protein: 5,
    },
    {
      name: "Eggs",
      quantity: "2 large",
      grams: 100,
      calories: 143,
      fat: 10,
      carbs: 1,
      protein: 13,
    },
    {
      name: "All-purpose flour",
      quantity: "1/2 cup",
      grams: 63,
      calories: 228,
      fat: 1,
      carbs: 48,
      protein: 6,
    },
    {
      name: "Olive oil",
      quantity: "1 tbsp",
      grams: 14,
      calories: 124,
      fat: 14,
      carbs: 0,
      protein: 0,
      estimated: true,
    },
    {
      name: "Chipotle ranch",
      quantity: "4 tbsp",
      grams: 60,
      calories: 220,
      fat: 22,
      carbs: 2,
      protein: 1,
      estimated: true,
      optional: true,
    },
  ];

  constructor() {
    this.updateIsLoggedIn();

    const recipeId = this.route.snapshot.paramMap.get("recipeId");
    if (!recipeId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("No recipeId was provided");
    }
    this.recipeId = recipeId;

    this.scale =
      this.recipeCompletionTrackerService.getRecipeScale(this.recipeId) || 1;

    this.applyScale();
  }

  ionViewWillEnter() {
    this.recipe = null;
    this.me = null;
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
    return Promise.all([
      this._loadRecipe(),
      this._loadSimilarRecipes(),
      this._loadMyUserProfile(),
    ]);
  }

  async _loadRecipe() {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.getRecipe.query({
        id: this.recipeId,
      }),
    );
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

    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = this.recipeService
        .parseNotes(this.recipe.notes)
        .map((note) => ({
          ...note,
          htmlContent: linkifyHtml(note.htmlContent),
        }));
    }

    const groupIdsSet = new Set<string>();
    for (const recipeLabel of this.recipe.recipeLabels) {
      const labelGroup = recipeLabel.label.labelGroup;
      if (labelGroup) {
        groupIdsSet.add(labelGroup.id);
        this.labelGroupById[labelGroup.id] = labelGroup;
      }
    }
    this.labelGroupIds = Array.from(groupIdsSet);

    this.applyScale();

    this.updateRatingVisual();
  }

  recipeLabelsForGroupId(labelGroupId: string | null) {
    if (!this.recipe) return [];

    return this.recipe.recipeLabels.filter(
      (recipeLabel) => recipeLabel.label.labelGroupId === labelGroupId,
    );
  }

  async _loadSimilarRecipes() {
    if (!this.isLoggedIn) return;

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.getSimilarRecipes.query({
        recipeIds: [this.recipeId],
      }),
    );
    if (!response) return;

    for (const el of response) {
      el.recipeImages = el.recipeImages.sort((a, b) => {
        return a.order - b.order;
      });
    }
    this.similarRecipes = response;
  }

  async _loadMyUserProfile() {
    if (!this.isLoggedIn) return;

    const response = await this.trpcService.handle(
      this.trpcService.trpc.users.getMe.query(),
    );
    if (!response) return;

    this.me = response;
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
        me: this.me,
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
      },
      cssClass: "scaleRecipeModal",
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (data?.scale) {
      this.scale = data.scale;
      this.recipeCompletionTrackerService.setRecipeScale(
        this.recipeId,
        this.scale,
      );
      this.applyScale();
    }
  }

  applyScale() {
    if (!this.recipe) return;

    this.ingredients = this.recipeService.parseIngredients(
      this.recipe.ingredients,
      this.scale,
    );
    this.instructions = this.recipeService.parseInstructions(
      this.recipe.instructions,
      this.scale,
    );
  }

  editRecipe() {
    this.navCtrl.navigateForward(
      RouteMap.EditRecipePage.getPath(this.recipeId),
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

    const response = await this.recipeService.delete(this.recipe.id);

    loading.dismiss();
    if (!response.success) return;

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath(this.recipe.folder));
  }

  async setLastMadeToday() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const lastMadeAt = dayjs().format("YYYY-MM-DD");

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.updateRecipe.mutate({
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
      }),
    );

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

  async moveToFolder(folderName: RecipeFolderName) {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.updateRecipe.mutate({
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
      }),
    );

    loading.dismiss();
    if (!response) return;

    window.location.reload();
  }

  async cloneRecipe() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const labelIds =
      this.me?.id === this.recipe.id
        ? this.recipe.recipeLabels.map((recipeLabel) => recipeLabel.label.id)
        : [];

    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.createRecipe.mutate({
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
      }),
    );

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
    return dayjs(date).format("YYYY-MM-DD");
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

  async openNutritionModal() {
    if (!this.mockNutrition) return;

    const modal = await this.modalCtrl.create({
      component: NutritionModalComponent,
      componentProps: {
        nutrition: this.mockNutrition,
        ingredientNutrition: this.mockIngredientNutrition,
        servings: this.parseServings(this.recipe?.yield),
      },
    });

    modal.present();
  }

  parseServings(yieldStr: string | undefined | null): number {
    if (!yieldStr) return 4;
    const match = yieldStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 4;
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
