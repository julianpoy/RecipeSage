import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  AlertController,
  ToastController,
  ModalController,
  PopoverController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { linkifyStr } from "~/utils/linkify";
import {
  RecipeService,
  Recipe,
  ParsedInstruction,
  ParsedIngredient,
  ParsedNote,
  RecipeFolderName,
} from "~/services/recipe.service";
import { Label, LabelService } from "~/services/label.service";
import { CookingToolbarService } from "~/services/cooking-toolbar.service";
import { LoadingService } from "~/services/loading.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { WakeLockService } from "~/services/wakelock.service";
import { PreferencesService } from "~/services/preferences.service";
import { RecipeDetailsPreferenceKey } from "@recipesage/util";
import { RecipeCompletionTrackerService } from "~/services/recipe-completion-tracker.service";

import { AddRecipeToShoppingListModalPage } from "../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page";
import { AddRecipeToMealPlanModalPage } from "../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page";
import { PrintRecipeModalPage } from "../print-recipe-modal/print-recipe-modal.page";
import { RecipeDetailsPopoverPage } from "../recipe-details-popover/recipe-details-popover.page";
import { ShareModalPage } from "~/pages/share-modal/share-modal.page";
import { AuthPage } from "~/pages/auth/auth.page";
import { ImageViewerComponent } from "~/modals/image-viewer/image-viewer.component";
import { ScaleRecipeComponent } from "~/modals/scale-recipe/scale-recipe.component";
import type {
  RecipeSummary,
  RecipeSummaryLite,
  UserPublic,
} from "@recipesage/trpc";
import { TRPCService } from "../../../services/trpc.service";

@Component({
  selector: "page-recipe",
  templateUrl: "recipe.page.html",
  styleUrls: ["recipe.page.scss"],
  providers: [RecipeService, LabelService],
})
export class RecipePage {
  defaultBackHref: string = RouteMap.HomePage.getPath("main");

  wakeLockRequest: null | {
    release: () => void;
  } = null;

  me: UserPublic | null = null;
  recipe: RecipeSummary | null = null;
  similarRecipes: RecipeSummaryLite[] = [];
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

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public preferencesService: PreferencesService,
    public wakeLockService: WakeLockService,
    public recipeCompletionTrackerService: RecipeCompletionTrackerService,
    public route: ActivatedRoute,
    public utilService: UtilService,
    public recipeService: RecipeService,
    public labelService: LabelService,
    public cookingToolbarService: CookingToolbarService,
    public capabilitiesService: CapabilitiesService,
    public translate: TranslateService,
    public trpcService: TRPCService,
  ) {
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

  async refresh(loader: any) {
    await this.load();
    loader.target.complete();
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

    if (this.recipe.url && !this.recipe.url.trim().startsWith("http")) {
      this.recipe.url = "http://" + this.recipe.url.trim();
    }

    if (this.recipe.instructions && this.recipe.instructions.length > 0) {
      this.instructions = this.recipeService.parseInstructions(
        this.recipe.instructions,
      );
    }

    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = this.recipeService
        .parseNotes(this.recipe.notes)
        .map((note) => ({
          ...note,
          content: linkifyStr(note.content),
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
        recipeId: this.recipeId,
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (!data || !data.action) return;
    switch (data.action) {
      case "updateWakeLock":
        const wlEnabled =
          this.preferencesService.preferences[
            RecipeDetailsPreferenceKey.EnableWakeLock
          ];
        wlEnabled ? this.setupWakeLock() : this.releaseWakeLock();
        break;
      case "addToShoppingList":
        this.addRecipeToShoppingList();
        break;
      case "addToMealPlan":
        this.addRecipeToMealPlan();
        break;
      case "share":
        this.shareRecipe();
        break;
      case "print":
        this.printRecipe();
        break;
      case "unpin":
        this.unpinRecipe();
        break;
      case "pin":
        this.pinRecipe();
        break;
      case "edit":
        this.editRecipe();
        break;
      case "clone":
        this.cloneRecipe();
        break;
      case "delete":
        this.deleteRecipe();
        break;
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
    const popover = await this.popoverCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale.toString(),
      },
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

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
      true,
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
          (recipeLabel) => recipeLabel.labelId,
        ),
        imageIds: this.recipe.recipeImages.map(
          (recipeImage) => recipeImage.imageId,
        ),
      }),
    );

    loading.dismiss();
    if (!response) return;

    this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(response.id)); // TODO: Check that this "refresh" works with new router
  }

  async cloneRecipe() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const labelIds =
      this.me?.id === this.recipe.id
        ? this.recipe.recipeLabels.map((recipeLabel) => recipeLabel.labelId)
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

  recipeLabelTrackBy(
    idx: number,
    recipeLabel: RecipeSummary["recipeLabels"][0],
  ) {
    return recipeLabel.id;
  }
}
