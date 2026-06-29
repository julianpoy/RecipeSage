import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Title } from "@angular/platform-browser";
import {
  NavController,
  AlertController,
  ToastController,
  ModalController,
  PopoverController,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap, UtilService } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";
import { CookingToolbarService } from "../../../services/cooking-toolbar.service";
import { WakeLockService } from "../../../services/wakelock.service";
import { FullscreenService } from "../../../services/fullscreen.service";
import { PreferencesService } from "../../../services/preferences.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { RouterOutputs } from "../../../services/server-actions/actions-base";
import { ImageViewerComponent } from "../../../modals/image-viewer/image-viewer.component";
import {
  ScaleRecipeComponent,
  type UnitSystem,
} from "../../../modals/scale-recipe/scale-recipe.component";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";
import { AuthPage } from "../../auth/auth.page";
import {
  DiscoverRecipePopoverPage,
  DiscoverRecipePopoverAction,
} from "../discover-recipe-popover/discover-recipe-popover.page";
import {
  ParsedIngredient,
  ParsedInstruction,
  ParsedNote,
  parseIngredients,
  parseInstructions,
  parseNotes,
  DISCOVER_CATEGORY_LABEL_KEYS,
  RecipeDetailsPreferenceKey,
} from "@recipesage/util/shared";
import { System } from "unitz-ts";
import { linkifyHtml } from "../../../utils/linkify";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonThumbnail,
  IonLabel,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonButton,
  IonChip,
  IonAvatar,
} from "@ionic/angular/standalone";
import {
  book,
  bookmark,
  create,
  documentText,
  fitness,
  link,
  list,
  options,
  pricetag,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

type DiscoverRecipeDetail = RouterOutputs["discover"]["getDiscoverRecipe"];

@Component({
  standalone: true,
  selector: "page-discover-recipe",
  templateUrl: "discover-recipe.page.html",
  styleUrls: ["discover-recipe.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    RatingComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonGrid,
    IonRow,
    IonCol,
    IonIcon,
    IonButton,
    IonChip,
    IonAvatar,
  ],
})
export class DiscoverRecipePage {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);
  private popoverCtrl = inject(PopoverController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private titleService = inject(Title);
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );
  private preferencesService = inject(PreferencesService);
  private wakeLockService = inject(WakeLockService);
  private fullscreenService = inject(FullscreenService);
  private serverActionsService = inject(ServerActionsService);
  cookingToolbarService = inject(CookingToolbarService);
  utilService = inject(UtilService);

  defaultBackHref = RouteMap.DiscoverPage.getPath();
  categoryLabelKeys = DISCOVER_CATEGORY_LABEL_KEYS;

  discoverRecipeId = "";
  recipe?: DiscoverRecipeDetail;
  notFound = false;

  ingredients?: ParsedIngredient[];
  instructions?: ParsedInstruction[];
  notes?: ParsedNote[];
  scale = "1";
  unitSystem: UnitSystem = "original";

  wakeLockRequest: null | {
    release: () => void;
  } = null;

  private meQuery = this.serverActionsService.users.getMe({ 401: () => {} });
  me = this.meQuery.value;

  constructor() {
    addIcons({
      book,
      bookmark,
      create,
      documentText,
      fitness,
      link,
      list,
      options,
      pricetag,
      trash,
    });
    this.applyRouteParams();
  }

  async presentPopover(event: Event) {
    if (!this.recipe) return;

    const popover = await this.popoverCtrl.create({
      component: DiscoverRecipePopoverPage,
      componentProps: {
        recipeId: this.recipe.id,
        isAuthor: this.isAuthor(),
      },
      event,
    });
    await popover.present();

    const { data } = await popover.onWillDismiss<{
      action?: DiscoverRecipePopoverAction;
    }>();
    if (!data || !data.action) return;

    switch (data.action) {
      case "edit":
        return this.edit();
      case "unpublish":
        return this.unpublish();
      case "pin":
        return this.pinRecipe();
      case "unpin":
        return this.unpinRecipe();
      case "enterCookMode":
        return this.enterCookMode();
      case "share":
        return this.share();
      case "report":
        return this.report();
      case "updateWakeLock":
        return this.preferencesService.preferences[
          RecipeDetailsPreferenceKey.EnableWakeLock
        ]
          ? this.setupWakeLock()
          : this.releaseWakeLock();
    }
  }

  pinRecipe() {
    if (!this.recipe) return;
    this.cookingToolbarService.pinRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      imageUrl:
        this.recipe.discoverRecipeImages[0]?.image.location || undefined,
      path: RouteMap.DiscoverRecipePage.getPath(this.recipe.id),
    });
  }

  unpinRecipe() {
    if (!this.recipe) return;
    this.cookingToolbarService.unpinRecipe(this.recipe.id);
  }

  instructionClicked(instruction: ParsedInstruction, idx: number) {
    if (instruction.isHeader) return;
    this.recipeCompletionTrackerService.toggleInstructionComplete(
      this.discoverRecipeId,
      idx,
    );
  }

  ingredientClicked(ingredient: ParsedIngredient, idx: number) {
    if (ingredient.isHeader) return;
    this.recipeCompletionTrackerService.toggleIngredientComplete(
      this.discoverRecipeId,
      idx,
    );
  }

  getInstructionComplete(idx: number) {
    return this.recipeCompletionTrackerService.getInstructionComplete(
      this.discoverRecipeId,
      idx,
    );
  }

  getIngredientComplete(idx: number) {
    return this.recipeCompletionTrackerService.getIngredientComplete(
      this.discoverRecipeId,
      idx,
    );
  }

  private applyRouteParams() {
    const discoverRecipeId =
      this.route.snapshot.paramMap.get("discoverRecipeId");
    if (!discoverRecipeId) {
      this.navCtrl.navigateRoot(RouteMap.DiscoverPage.getPath());
      throw new Error("No discoverRecipeId was provided");
    }
    this.discoverRecipeId = discoverRecipeId;
    this.scale =
      this.recipeCompletionTrackerService.getRecipeScale(
        this.discoverRecipeId,
      ) || "1";
  }

  ionViewWillEnter() {
    const snapshotId = this.route.snapshot.paramMap.get("discoverRecipeId");
    if (snapshotId && snapshotId !== this.discoverRecipeId) {
      this.applyRouteParams();
    }
    this.recipe = undefined;
    this.notFound = false;
    this.meQuery.refresh();
    this.load();
    this.setupWakeLock();
  }

  ionViewWillLeave() {
    this.releaseWakeLock();
  }

  async load() {
    const loading = this.loadingService.start();

    const response = await this.serverActionsService.discover.getDiscoverRecipe(
      { id: this.discoverRecipeId },
      {
        404: () => {
          this.notFound = true;
        },
      },
    );

    loading.dismiss();
    if (!response) return;

    this.recipe = response;

    const title = await this.translate
      .get("generic.labeledPageTitle", {
        title: response.title,
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

    const imageRefs = this.recipe.discoverRecipeImages
      .map((discoverRecipeImage) => ({
        url: discoverRecipeImage.image.location,
        order: discoverRecipeImage.order,
      }))
      .sort((a, b) => a.order - b.order)
      .map((image) => ({ url: image.url }));

    this.ingredients = parseIngredients(
      this.recipe.ingredients,
      this.scale,
      targetSystem,
    );
    this.instructions = parseInstructions(
      this.recipe.instructions,
      this.scale,
      targetSystem,
      imageRefs,
    );
    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = parseNotes(
        this.recipe.notes,
        this.scale,
        targetSystem,
        imageRefs,
      ).map((note) => ({
        ...note,
        htmlContent: linkifyHtml(note.htmlContent),
      }));
    }
  }

  get unitSystemLabelKey() {
    switch (this.unitSystem) {
      case "metric":
        return "components.scaleRecipe.system.metric";
      case "imperial":
        return "components.scaleRecipe.system.imperial";
      default:
        return "components.scaleRecipe.system.original";
    }
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
        this.discoverRecipeId,
        this.scale,
      );
    }
    if (data.unitSystem) {
      this.unitSystem = data.unitSystem;
    }
    this.applyScale();
  }

  async enterCookMode() {
    if (!this.recipe) return;
    await this.fullscreenService.request();
    this.navCtrl.navigateForward(
      RouteMap.DiscoverRecipePageCook.getPath(this.recipe.id),
    );
  }

  async share() {
    if (!this.recipe) return;

    const url =
      window.location.origin +
      "/app" +
      RouteMap.DiscoverRecipePage.getPath(this.recipe.id);

    const popover = await this.popoverCtrl.create({
      component: CopyWithWebshareComponent,
      componentProps: {
        copyText: url,
        webshareURL: url,
        webshareTitle: this.recipe.title,
        webshareText: this.recipe.title,
      },
    });
    popover.present();
  }

  async report() {
    if (!this.recipe) return;

    if (!this.isLoggedIn()) {
      const authModal = await this.modalCtrl.create({
        component: AuthPage,
      });
      await authModal.present();
      await authModal.onDidDismiss();
      await this.meQuery.refresh();
      if (!this.isLoggedIn()) return;
    }

    const header = await this.translate
      .get("pages.discoverRecipe.report.confirm.header")
      .toPromise();
    const message = await this.translate
      .get("pages.discoverRecipe.report.confirm.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.discoverRecipe.report.reasonPlaceholder")
      .toPromise();
    const tooShort = await this.translate
      .get("pages.discoverRecipe.report.reasonTooShort")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("pages.discoverRecipe.report")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          name: "reason",
          type: "textarea",
          placeholder,
          attributes: {
            maxlength: 2000,
          },
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          cssClass: "alertDanger",
          handler: (data) => {
            const reason = (data.reason || "").trim();
            if (reason.length < 5) {
              this.toastCtrl
                .create({
                  message: tooShort,
                  duration: 5000,
                })
                .then((toast) => toast.present());
              return false;
            }
            this._report(reason);
            return true;
          },
        },
      ],
    });
    alert.present();
  }

  private async _report(reason: string) {
    if (!this.recipe) return;

    const response =
      await this.serverActionsService.discover.reportDiscoverRecipe({
        id: this.recipe.id,
        reason,
      });

    if (!response) return;

    const message = await this.translate
      .get("pages.discoverRecipe.report.success")
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    toast.present();
  }

  openCategory(category: string) {
    this.navCtrl.navigateForward(
      RouteMap.DiscoverPage.getPath({ categories: [category] }),
    );
  }

  openLinkedRecipe(id: string) {
    this.navCtrl.navigateForward(RouteMap.DiscoverRecipePage.getPath(id));
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

  isLoggedIn() {
    return this.utilService.isLoggedIn();
  }

  isAuthor() {
    return !!this.recipe && this.me()?.id === this.recipe.author.id;
  }

  hasNutrition(): boolean {
    if (!this.recipe) return false;
    return [
      this.recipe.nutritionServingSize,
      this.recipe.nutritionCalories,
      this.recipe.nutritionTotalFat,
      this.recipe.nutritionSaturatedFat,
      this.recipe.nutritionTransFat,
      this.recipe.nutritionPolyunsaturatedFat,
      this.recipe.nutritionMonounsaturatedFat,
      this.recipe.nutritionCholesterol,
      this.recipe.nutritionSodium,
      this.recipe.nutritionTotalCarbs,
      this.recipe.nutritionDietaryFiber,
      this.recipe.nutritionTotalSugars,
      this.recipe.nutritionAddedSugars,
      this.recipe.nutritionProtein,
      this.recipe.nutritionVitaminD,
      this.recipe.nutritionCalcium,
      this.recipe.nutritionIron,
      this.recipe.nutritionPotassium,
      this.recipe.nutritionOtherDetails,
    ].some((value) => value != null && value !== "");
  }

  authorProfilePath(handle: string) {
    return RouteMap.ProfilePage.getPath(`@${handle}`);
  }

  openAuthorProfile(handle: string) {
    this.navCtrl.navigateForward(this.authorProfilePath(handle));
  }

  atHandle(handle: string) {
    return `@${handle}`;
  }

  formatDate(date: Date | string | number) {
    return this.utilService.formatDate(date, { times: false });
  }

  async openImageViewer() {
    if (!this.recipe || !this.recipe.discoverRecipeImages.length) return;

    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.recipe.discoverRecipeImages.map(
          (discoverRecipeImage) => discoverRecipeImage.image.location,
        ),
      },
    });
    imageViewerModal.present();
  }

  async rate(rating: number) {
    if (!this.recipe) return;

    const response =
      await this.serverActionsService.discover.rateDiscoverRecipe({
        id: this.recipe.id,
        rating,
      });

    if (!response) return;

    this.recipe = {
      ...this.recipe,
      myRating: response.myRating,
      ratingAverage: response.ratingAverage,
      ratingCount: response.ratingCount,
    };
  }

  async save() {
    if (!this.recipe) return;

    const title = this.recipe.title;

    const loading = this.loadingService.start();
    const conflictingRecipes =
      await this.serverActionsService.recipes.getRecipesByTitle({
        title,
      });
    const uniqueTitle =
      await this.serverActionsService.recipes.getUniqueRecipeTitle({
        title,
      });
    loading.dismiss();

    if (!conflictingRecipes || !uniqueTitle) return;

    if (!conflictingRecipes.length) {
      await this._save(title);
      return;
    }

    const header = await this.translate
      .get("pages.editRecipe.conflict.title")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.conflict.message", { title, uniqueTitle })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const rename = await this.translate
      .get("pages.editRecipe.conflict.rename")
      .toPromise();
    const ignore = await this.translate
      .get("pages.editRecipe.conflict.ignore")
      .toPromise();

    const confirmPrompt = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: rename,
          handler: () => {
            this._save(uniqueTitle);
          },
        },
        {
          text: ignore,
          handler: () => {
            this._save(title);
          },
        },
      ],
    });

    await confirmPrompt.present();
  }

  private async _save(title: string) {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.discover.saveDiscoverRecipe({
        id: this.recipe.id,
        title,
      });

    loading.dismiss();
    if (!response) return;

    const message = await this.translate
      .get("pages.discoverRecipe.saveSuccess")
      .toPromise();
    const close = await this.translate.get("generic.close").toPromise();

    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
      buttons: [
        {
          side: "end",
          role: "cancel",
          text: close,
        },
      ],
    });
    toast.present();

    this.navCtrl.navigateForward(
      RouteMap.RecipePage.getPath(response.recipeId),
    );
  }

  async authAndSave() {
    const authModal = await this.modalCtrl.create({
      component: AuthPage,
      componentProps: {
        startWithRegister: true,
      },
    });
    await authModal.present();
    await authModal.onDidDismiss();

    await this.meQuery.refresh();

    if (this.isLoggedIn()) {
      await this.save();
    }
  }

  edit() {
    if (!this.recipe) return;
    this.navCtrl.navigateForward(
      RouteMap.EditDiscoverRecipePage.getPath(this.recipe.id),
    );
  }

  async unpublish() {
    if (!this.recipe) return;

    const header = await this.translate
      .get("pages.discoverRecipe.unpublish.confirm.header")
      .toPromise();
    const message = await this.translate
      .get("pages.discoverRecipe.unpublish.confirm.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("pages.discoverRecipe.unpublish")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          cssClass: "alertDanger",
          handler: () => {
            this._unpublish();
          },
        },
      ],
    });
    alert.present();
  }

  private async _unpublish() {
    if (!this.recipe) return;

    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.discover.unpublishDiscoverRecipe({
        id: this.recipe.id,
      });

    loading.dismiss();
    if (!response) return;

    this.navCtrl.navigateRoot(RouteMap.DiscoverPage.getPath());
  }
}
