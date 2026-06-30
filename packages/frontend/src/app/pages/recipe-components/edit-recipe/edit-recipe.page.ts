import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import dayjs from "dayjs";
import {
  FilePicker,
  type PickFilesResult,
} from "@capawesome/capacitor-file-picker";
import {
  NavController,
  AlertController,
  PopoverController,
  LoadingController,
  type AccordionGroupChangeEventDetail,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
  type Photo,
} from "@capacitor/camera";

import { RouteMap } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { UnsavedChangesService } from "../../../services/unsaved-changes.service";
import { CapabilitiesService } from "../../../services/capabilities.service";
import { ImageService } from "../../../services/image.service";
import { PreferencesService } from "../../../services/preferences.service";
import {
  RecipeDetailsPreferenceKey,
  decodeBasicHtmlEntities,
} from "@recipesage/util/shared";
import { getQueryParam } from "../../../utils/queryParams";

import { EditRecipePopoverPage } from "../edit-recipe-popover/edit-recipe-popover.page";
import type {
  ImageSummary,
  LabelGroupSummary,
  LabelSummary,
  RecipeSummary,
  RecipeSummaryLite,
} from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import {
  SelectableItem,
  SelectMultipleItemsComponent,
} from "../../../components/select-multiple-items/select-multiple-items.component";
import { IS_SELFHOST } from "@recipesage/frontend/src/environments/environment";
import { ErrorHandlers } from "../../../services/http-error-handler.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";
import { MultiImageUploadComponent } from "../../../components/multi-image-upload/multi-image-upload.component";
import { MlService } from "../../../services/ml.service";
import { Capacitor } from "@capacitor/core";
import { SelectRecipeComponent } from "../../../components/select-recipe/select-recipe.component";
import { RecipeFormatToolbarComponent } from "../../../components/recipe-format-toolbar/recipe-format-toolbar.component";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonPopover,
  IonList,
  IonItem,
  IonModal,
  IonAccordionGroup,
  IonAccordion,
  IonLabel,
  IonBadge,
  IonAvatar,
} from "@ionic/angular/standalone";
import {
  cameraOutline,
  closeOutline,
  cutOutline,
  documentTextOutline,
  linkOutline,
  optionsOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-edit-recipe",
  templateUrl: "edit-recipe.page.html",
  styleUrls: ["edit-recipe.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectMultipleItemsComponent,
    RatingComponent,
    MultiImageUploadComponent,
    SelectRecipeComponent,
    RecipeFormatToolbarComponent,
    TextInputComponent,
    TextAreaComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonPopover,
    IonList,
    IonItem,
    IonModal,
    IonAccordionGroup,
    IonAccordion,
    IonLabel,
    IonBadge,
    IonAvatar,
  ],
})
export class EditRecipePage {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private popoverCtrl = inject(PopoverController);
  private serverActionsService = inject(ServerActionsService);
  private mlService = inject(MlService);
  private unsavedChangesService = inject(UnsavedChangesService);
  private loadingCtrl = inject(LoadingController);
  private loadingService = inject(LoadingService);
  private imageService = inject(ImageService);
  private capabilitiesService = inject(CapabilitiesService);
  private preferencesService = inject(PreferencesService);

  saving = false;
  defaultBackHref: string = RouteMap.HomePage.getPath("main");

  nutritionAccordionValue: string | null = this.preferencesService.preferences[
    RecipeDetailsPreferenceKey.AutoExpandNutrition
  ]
    ? "nutrition"
    : null;

  recipeId?: string;
  originalTitle?: string;
  // TODO: Clean this up
  fullRecipe?: RecipeSummary;
  recipe: Partial<RecipeSummary> = {
    title: "",
    description: "",
    yield: "",
    activeTime: "",
    totalTime: "",
    source: "",
    url: "",
    notes: "",
    ingredients: "",
    instructions: "",
  };

  images: ImageSummary[] = [];
  labels: LabelSummary[] = [];
  labelGroups: LabelGroupSummary[] = [];
  selectedLabels: LabelSummary[] = [];

  selectedLinkedRecipes: {
    id: string;
    userId: string;
    title: string;
    recipeImages: RecipeSummaryLite["recipeImages"];
  }[] = [];

  isAutoclipPopoverOpen = false;

  constructor() {
    addIcons({
      cameraOutline,
      closeOutline,
      cutOutline,
      documentTextOutline,
      linkOutline,
      optionsOutline,
    });
    this.applyRouteParams();
    this.load();
  }

  private applyRouteParams() {
    const recipeId = this.route.snapshot.paramMap.get("recipeId") || "new";

    if (recipeId === "new") {
      this.recipeId = undefined;
      this.checkAutoClip();
    } else {
      this.recipeId = recipeId;
    }

    this.defaultBackHref = this.recipeId
      ? RouteMap.RecipePage.getPath(this.recipeId)
      : RouteMap.HomePage.getPath("main");
  }

  ionViewWillEnter() {
    const snapshotRecipeId =
      this.route.snapshot.paramMap.get("recipeId") || "new";
    const currentRecipeId = this.recipeId || "new";
    if (snapshotRecipeId !== currentRecipeId) {
      this.applyRouteParams();
      this.load();
    }
  }

  async load() {
    const loading = this.loadingService.start();

    // Important that we load all in parallel so that user isn't left waiting for slow connections
    await Promise.all([
      this._loadRecipe(),
      this._loadLabels(),
      this._loadLabelGroups(),
    ]);

    const labelsById = this.labels.reduce(
      (acc, label) => {
        acc[label.id] = label;
        return acc;
      },
      {} as Record<string, LabelSummary>,
    );

    if (this.fullRecipe) {
      this.selectedLabels = this.fullRecipe.recipeLabels
        .map((recipeLabel) => labelsById[recipeLabel.label.id])
        .filter((label) => label);

      this.selectedLinkedRecipes = this.fullRecipe.recipeLinks.map((link) => ({
        ...link.linkedRecipe,
      }));
    }

    loading.dismiss();
  }

  async _loadRecipe() {
    if (this.recipeId) {
      const response = await this.serverActionsService.recipes.getRecipe({
        id: this.recipeId,
      });

      if (response) {
        this.fullRecipe = response;
        this.recipe = {
          ...response,
          ingredients: decodeBasicHtmlEntities(response.ingredients),
          instructions: decodeBasicHtmlEntities(response.instructions),
          notes: decodeBasicHtmlEntities(response.notes),
        };
        this.images = response.recipeImages
          .sort((a, b) => a.order - b.order)
          .map((el) => el.image);
        this.originalTitle = response.title;
      }
    }
  }

  async _loadLabels() {
    const labels = await this.serverActionsService.labels.getLabels();
    if (labels) {
      this.labels = labels.sort((a, b) => a.title.localeCompare(b.title));
    }
  }

  async _loadLabelGroups() {
    const labelGroups =
      await this.serverActionsService.labelGroups.getLabelGroups();
    if (labelGroups) {
      this.labelGroups = labelGroups.sort((a, b) =>
        a.title.localeCompare(b.title),
      );
    }
  }

  labelsForGroupId(labels: LabelSummary[], labelGroupId: string | null) {
    const filtered = labels.filter(
      (label) => label.labelGroupId === labelGroupId,
    );

    return filtered;
  }

  labelsNotInGroupId(labels: LabelSummary[], labelGroupId: string | null) {
    const filtered = labels.filter(
      (label) => label.labelGroupId !== labelGroupId,
    );

    return filtered;
  }

  disallowedTitleMap(labels: LabelSummary[], labelGroupId: string | null) {
    const labelsNotInGroup = this.labelsNotInGroupId(labels, labelGroupId);

    const labelTitlesInOtherGroups = labelsNotInGroup.map(
      (label) => label.title,
    );

    return labelTitlesInOtherGroups.reduce(
      (acc, title) => {
        acc[title] = "pages.editRecipe.addLabel.otherGroup";
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  checkAutoClip() {
    // Check if we're handling a Web Share API launch. If so, attempt to automatically import the given recipe
    const autofillUrl = getQueryParam("autofill-url");
    const sharetargetText = getQueryParam("sharetarget-text");
    const sharetargetTitle = getQueryParam("sharetarget-title");

    const autoClipSource = autofillUrl || sharetargetText || sharetargetTitle;

    if (autoClipSource) this.autoClip(autoClipSource);
  }

  autoClip(source: string) {
    const lastUrlInString = this.findLastUrlInString(source);
    if (lastUrlInString) this._clipFromUrl(lastUrlInString);
  }

  findLastUrlInString(s: unknown) {
    if (typeof s !== "string") return;

    // Robust URL finding regex from https://www.regextester.com/93652
    // TODO: Replace this with a lib
    const matchedUrl = s.match(
      /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»""'']))?/gi,
    );
    if (matchedUrl) return matchedUrl.pop();
  }

  lastMadeAtDateChange(event: any) {
    const value = event.target.value;
    this.recipe.lastMadeAt = value || "";
    this.markAsDirty();
  }

  private isValidNutritionValue(value: unknown): boolean {
    if (value == null || value === "") return true;
    const num = Number(value);
    return !isNaN(num) && num >= 0;
  }

  private toNutritionNumber(value: unknown): number | null {
    if (value == null || value === "") return null;
    return Number(value);
  }

  private nutritionFieldValues(): unknown[] {
    return [
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
    ];
  }

  private nutritionStringFieldValues(): (string | null | undefined)[] {
    return [
      this.recipe.nutritionServingSize,
      this.recipe.nutritionOtherDetails,
    ];
  }

  hasNutrition(): boolean {
    return [
      ...this.nutritionFieldValues(),
      ...this.nutritionStringFieldValues(),
    ].some((v) => v != null && v !== "");
  }

  nutritionFieldCount(): number {
    return [
      ...this.nutritionFieldValues(),
      ...this.nutritionStringFieldValues(),
    ].filter((v) => v != null && v !== "").length;
  }

  hasInvalidNutritionFields(): boolean {
    return this.nutritionFieldValues().some(
      (v) => !this.isValidNutritionValue(v),
    );
  }

  onNutritionAccordionChange(
    event: CustomEvent<AccordionGroupChangeEventDetail>,
  ) {
    if (event.target !== event.currentTarget) return;
    const value = event.detail.value;
    this.nutritionAccordionValue = typeof value === "string" ? value : null;
  }

  async parseAndApplyNutrition(text: string) {
    const response = await this.serverActionsService.ml.getNutritionFromText({
      text,
    });
    if (!response) return;

    this.recipe.nutritionServingSize = response.servingSize;
    this.recipe.nutritionCalories = response.calories;
    this.recipe.nutritionTotalFat = response.totalFat;
    this.recipe.nutritionSaturatedFat = response.saturatedFat;
    this.recipe.nutritionTransFat = response.transFat;
    this.recipe.nutritionPolyunsaturatedFat = response.polyunsaturatedFat;
    this.recipe.nutritionMonounsaturatedFat = response.monounsaturatedFat;
    this.recipe.nutritionCholesterol = response.cholesterol;
    this.recipe.nutritionSodium = response.sodium;
    this.recipe.nutritionTotalCarbs = response.totalCarbs;
    this.recipe.nutritionDietaryFiber = response.dietaryFiber;
    this.recipe.nutritionTotalSugars = response.totalSugars;
    this.recipe.nutritionAddedSugars = response.addedSugars;
    this.recipe.nutritionProtein = response.protein;
    this.recipe.nutritionVitaminD = response.vitaminD;
    this.recipe.nutritionCalcium = response.calcium;
    this.recipe.nutritionIron = response.iron;
    this.recipe.nutritionPotassium = response.potassium;
    this.markAsDirty();
  }

  async confirmClearNutrition() {
    const header = await this.translate
      .get("pages.editRecipe.input.nutritionClearConfirm.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.input.nutritionClearConfirm.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("pages.editRecipe.input.nutritionClear")
      .toPromise();

    (
      await this.alertCtrl.create({
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
              this.clearNutrition();
            },
          },
        ],
      })
    ).present();
  }

  clearNutrition() {
    this.recipe.nutritionServingSize = undefined;
    this.recipe.nutritionCalories = undefined;
    this.recipe.nutritionTotalFat = undefined;
    this.recipe.nutritionSaturatedFat = undefined;
    this.recipe.nutritionTransFat = undefined;
    this.recipe.nutritionPolyunsaturatedFat = undefined;
    this.recipe.nutritionMonounsaturatedFat = undefined;
    this.recipe.nutritionCholesterol = undefined;
    this.recipe.nutritionSodium = undefined;
    this.recipe.nutritionTotalCarbs = undefined;
    this.recipe.nutritionDietaryFiber = undefined;
    this.recipe.nutritionTotalSugars = undefined;
    this.recipe.nutritionAddedSugars = undefined;
    this.recipe.nutritionProtein = undefined;
    this.recipe.nutritionVitaminD = undefined;
    this.recipe.nutritionCalcium = undefined;
    this.recipe.nutritionIron = undefined;
    this.recipe.nutritionPotassium = undefined;
    this.recipe.nutritionOtherDetails = undefined;
    this.markAsDirty();
  }

  async autofillNutritionFromText() {
    const header = await this.translate
      .get("pages.editRecipe.nutritionAutofill.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.nutritionAutofill.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.editRecipe.nutritionAutofill.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();
    const error = await this.translate.get("generic.error").toPromise();
    const invalid = await this.translate
      .get("pages.editRecipe.nutritionAutofill.invalid")
      .toPromise();

    const inputId = "nutrition-autofill-text-input";
    const prompt = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          id: inputId,
          name: "text",
          type: "textarea",
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: okay,
          handler: async (data) => {
            const { text } = data;
            if (!text || text.length < 10) {
              (
                await this.alertCtrl.create({
                  header: error,
                  message: invalid,
                  buttons: [{ text: okay }],
                })
              ).present();
              return;
            }
            this._autofillNutrition(text);
          },
        },
      ],
    });

    await prompt.present();
    document.getElementById(inputId)?.focus();
  }

  async _autofillNutrition(text: string) {
    const pleaseWait = await this.translate
      .get("pages.editRecipe.nutritionAutofill.loading")
      .toPromise();
    const failedHeader = await this.translate.get("generic.error").toPromise();
    const failedMessage = await this.translate
      .get("pages.editRecipe.nutritionAutofill.failed")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();

    const response = await this.serverActionsService.ml.getNutritionFromText(
      { text },
      {
        400: async () => {
          (
            await this.alertCtrl.create({
              header: failedHeader,
              message: failedMessage,
              buttons: [{ text: okay }],
            })
          ).present();
        },
      },
    );

    if (response) {
      this.recipe.nutritionServingSize = response.servingSize;
      this.recipe.nutritionCalories = response.calories;
      this.recipe.nutritionTotalFat = response.totalFat;
      this.recipe.nutritionSaturatedFat = response.saturatedFat;
      this.recipe.nutritionTransFat = response.transFat;
      this.recipe.nutritionPolyunsaturatedFat = response.polyunsaturatedFat;
      this.recipe.nutritionMonounsaturatedFat = response.monounsaturatedFat;
      this.recipe.nutritionCholesterol = response.cholesterol;
      this.recipe.nutritionSodium = response.sodium;
      this.recipe.nutritionTotalCarbs = response.totalCarbs;
      this.recipe.nutritionDietaryFiber = response.dietaryFiber;
      this.recipe.nutritionTotalSugars = response.totalSugars;
      this.recipe.nutritionAddedSugars = response.addedSugars;
      this.recipe.nutritionProtein = response.protein;
      this.recipe.nutritionVitaminD = response.vitaminD;
      this.recipe.nutritionCalcium = response.calcium;
      this.recipe.nutritionIron = response.iron;
      this.recipe.nutritionPotassium = response.potassium;
      this.markAsDirty();
    }

    loading.dismiss();
  }

  async _create(title: string) {
    const response = await this.serverActionsService.recipes.createRecipe({
      title,
      description: this.recipe.description || "",
      yield: this.recipe.yield || "",
      activeTime: this.recipe.activeTime || "",
      totalTime: this.recipe.totalTime || "",
      source: this.recipe.source || "",
      url: this.recipe.url || "",
      notes: this.recipe.notes || "",
      ingredients: this.recipe.ingredients || "",
      instructions: this.recipe.instructions || "",
      rating: this.recipe.rating || null,
      folder: "main",
      imageIds: this.images.map((image) => image.id),
      labelIds: this.selectedLabels.map((label) => label.id),
      lastMadeAt: this.recipe.lastMadeAt || null,
      linkedRecipeIds: this.selectedLinkedRecipes.map((recipe) => recipe.id),
      nutritionServingSize: this.recipe.nutritionServingSize || null,
      nutritionCalories: this.toNutritionNumber(this.recipe.nutritionCalories),
      nutritionTotalFat: this.toNutritionNumber(this.recipe.nutritionTotalFat),
      nutritionSaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionSaturatedFat,
      ),
      nutritionTransFat: this.toNutritionNumber(this.recipe.nutritionTransFat),
      nutritionPolyunsaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionPolyunsaturatedFat,
      ),
      nutritionMonounsaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionMonounsaturatedFat,
      ),
      nutritionCholesterol: this.toNutritionNumber(
        this.recipe.nutritionCholesterol,
      ),
      nutritionSodium: this.toNutritionNumber(this.recipe.nutritionSodium),
      nutritionTotalCarbs: this.toNutritionNumber(
        this.recipe.nutritionTotalCarbs,
      ),
      nutritionDietaryFiber: this.toNutritionNumber(
        this.recipe.nutritionDietaryFiber,
      ),
      nutritionTotalSugars: this.toNutritionNumber(
        this.recipe.nutritionTotalSugars,
      ),
      nutritionAddedSugars: this.toNutritionNumber(
        this.recipe.nutritionAddedSugars,
      ),
      nutritionProtein: this.toNutritionNumber(this.recipe.nutritionProtein),
      nutritionVitaminD: this.toNutritionNumber(this.recipe.nutritionVitaminD),
      nutritionCalcium: this.toNutritionNumber(this.recipe.nutritionCalcium),
      nutritionIron: this.toNutritionNumber(this.recipe.nutritionIron),
      nutritionPotassium: this.toNutritionNumber(
        this.recipe.nutritionPotassium,
      ),
      nutritionOtherDetails: this.recipe.nutritionOtherDetails || null,
    });

    return response;
  }

  async _update(id: string, title: string) {
    const response = await this.serverActionsService.recipes.updateRecipe({
      id,
      title,
      description: this.recipe.description || "",
      yield: this.recipe.yield || "",
      activeTime: this.recipe.activeTime || "",
      totalTime: this.recipe.totalTime || "",
      source: this.recipe.source || "",
      url: this.recipe.url || "",
      notes: this.recipe.notes || "",
      ingredients: this.recipe.ingredients || "",
      instructions: this.recipe.instructions || "",
      rating: this.recipe.rating || null,
      folder: "main",
      imageIds: this.images.map((image) => image.id),
      labelIds: this.selectedLabels.map((label) => label.id),
      lastMadeAt: this.recipe.lastMadeAt || null,
      linkedRecipeIds: this.selectedLinkedRecipes.map((recipe) => recipe.id),
      nutritionServingSize: this.recipe.nutritionServingSize || null,
      nutritionCalories: this.toNutritionNumber(this.recipe.nutritionCalories),
      nutritionTotalFat: this.toNutritionNumber(this.recipe.nutritionTotalFat),
      nutritionSaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionSaturatedFat,
      ),
      nutritionTransFat: this.toNutritionNumber(this.recipe.nutritionTransFat),
      nutritionPolyunsaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionPolyunsaturatedFat,
      ),
      nutritionMonounsaturatedFat: this.toNutritionNumber(
        this.recipe.nutritionMonounsaturatedFat,
      ),
      nutritionCholesterol: this.toNutritionNumber(
        this.recipe.nutritionCholesterol,
      ),
      nutritionSodium: this.toNutritionNumber(this.recipe.nutritionSodium),
      nutritionTotalCarbs: this.toNutritionNumber(
        this.recipe.nutritionTotalCarbs,
      ),
      nutritionDietaryFiber: this.toNutritionNumber(
        this.recipe.nutritionDietaryFiber,
      ),
      nutritionTotalSugars: this.toNutritionNumber(
        this.recipe.nutritionTotalSugars,
      ),
      nutritionAddedSugars: this.toNutritionNumber(
        this.recipe.nutritionAddedSugars,
      ),
      nutritionProtein: this.toNutritionNumber(this.recipe.nutritionProtein),
      nutritionVitaminD: this.toNutritionNumber(this.recipe.nutritionVitaminD),
      nutritionCalcium: this.toNutritionNumber(this.recipe.nutritionCalcium),
      nutritionIron: this.toNutritionNumber(this.recipe.nutritionIron),
      nutritionPotassium: this.toNutritionNumber(
        this.recipe.nutritionPotassium,
      ),
      nutritionOtherDetails: this.recipe.nutritionOtherDetails || null,
    });

    return response;
  }

  async _save() {
    if (!this.recipe.title) return;
    if (this.saving) return;

    const loading = this.loadingService.start();
    this.saving = true;

    const response = await (this.recipe.id
      ? this._update(this.recipe.id, this.recipe.title)
      : this._create(this.recipe.title));

    loading.dismiss();
    this.saving = false;
    if (!response) return;

    this.markAsClean();

    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(response.id), {
      replaceUrl: true,
    });
  }

  async _saveCheckConflict() {
    if (!this.recipe.title) return;

    const loading = this.loadingService.start();

    const conflictingRecipes =
      await this.serverActionsService.recipes.getRecipesByTitle({
        title: this.recipe.title,
      });

    const uniqueTitle =
      await this.serverActionsService.recipes.getUniqueRecipeTitle({
        title: this.recipe.title,
        ignoreIds: this.recipe.id ? [this.recipe.id] : undefined,
      });

    loading.dismiss();
    if (!conflictingRecipes || !uniqueTitle) return;

    // We do not want to warn user if they haven't modified the title
    const hasTitleChanged = this.originalTitle !== this.recipe.title;
    if (
      hasTitleChanged &&
      conflictingRecipes.some((recipe) => recipe.id !== this.recipe.id)
    ) {
      const header = await this.translate
        .get("pages.editRecipe.conflict.title")
        .toPromise();
      const message = await this.translate
        .get("pages.editRecipe.conflict.message", {
          title: this.recipe.title,
          uniqueTitle,
        })
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
              this.recipe.title = uniqueTitle;
              this._save();
            },
          },
          {
            text: ignore,
            handler: () => {
              this._save();
            },
          },
        ],
      });

      await confirmPrompt.present();
    } else {
      this._save();
    }
  }

  async save() {
    if (!this.recipe.title) {
      const header = await this.translate.get("generic.error").toPromise();
      const message = await this.translate
        .get("pages.editRecipe.titleRequired")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      (
        await this.alertCtrl.create({
          header,
          message,
          buttons: [
            {
              text: okay,
            },
          ],
        })
      ).present();
      return;
    }

    if (this.hasInvalidNutritionFields()) {
      const header = await this.translate.get("generic.error").toPromise();
      const message = await this.translate
        .get("pages.editRecipe.nutritionInvalid")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      (
        await this.alertCtrl.create({
          header,
          message,
          buttons: [{ text: okay }],
        })
      ).present();
      return;
    }

    const missingWarnLabelGroups = this.getMissingWarnLabelGroups();
    if (missingWarnLabelGroups.length) {
      const header = await this.translate
        .get("pages.editRecipe.missingLabelGroup.title")
        .toPromise();
      const message = await this.translate
        .get("pages.editRecipe.missingLabelGroup.message", {
          groupName: missingWarnLabelGroups[0].title,
        })
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const okay = await this.translate.get("generic.ignore").toPromise();

      const confirmPrompt = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancel,
            role: "cancel",
          },
          {
            text: okay,
            handler: () => {
              this._saveCheckConflict();
            },
          },
        ],
      });

      await confirmPrompt.present();
    } else {
      return this._saveCheckConflict();
    }
  }

  getMissingWarnLabelGroups() {
    const warnLabelGroups = this.labelGroups.filter(
      (labelGroup) => labelGroup.warnWhenNotPresent,
    );
    const warnLabelGroupsById = warnLabelGroups.reduce(
      (acc, labelGroup) => {
        acc[labelGroup.id] = labelGroup;
        return acc;
      },
      {} as Record<string, LabelGroupSummary>,
    );
    const missingLabelGroupIds = new Set(Object.keys(warnLabelGroupsById));

    for (const selectedLabel of this.selectedLabels) {
      if (!selectedLabel.labelGroupId) continue;
      missingLabelGroupIds.delete(selectedLabel.labelGroupId);
    }

    const missingLabelGroups = Array.from(missingLabelGroupIds).map(
      (el) => warnLabelGroupsById[el],
    );

    return missingLabelGroups;
  }

  markAsDirty() {
    this.unsavedChangesService.setPendingChanges();
  }

  markAsClean() {
    this.unsavedChangesService.clearPendingChanges();
  }

  isValidHttpUrl(input: string) {
    let url: URL;

    // Fallback for browsers without URL constructor
    if (!URL) return true;

    try {
      url = new URL(input);
    } catch (err) {
      return false;
    }

    return url.protocol.startsWith("http");
  }

  isUnsupportedSiteUrl(input: string) {
    let url: URL;

    const regex = /youtube\.com|tiktok\.com|facebook\.com|instagram\.com/;

    // Fallback for browsers without URL constructor
    if (!URL) return !!input.match(regex);

    try {
      url = new URL(input);
    } catch (err) {
      return false;
    }

    return !!url.host.match(regex);
  }

  getSelfhostErrorHandlers(): ErrorHandlers {
    return IS_SELFHOST
      ? {
          500: async () => {
            const header = await this.translate
              .get("generic.error")
              .toPromise();
            const message = await this.translate
              .get("pages.editRecipe.clip.failedSelfhost")
              .toPromise();
            const okay = await this.translate.get("generic.okay").toPromise();

            const errorAlert = await this.alertCtrl.create({
              header,
              message,
              buttons: [
                {
                  text: okay,
                  role: "cancel",
                },
              ],
            });

            errorAlert.present();
          },
        }
      : {};
  }

  private readonly SUPPORTED_DOCUMENT_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "text/markdown",
    "text/html",
    "text/plain",
  ];

  private getDocumentExtension(fileName: string): string {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex < 0) return "";
    return fileName.substring(dotIndex).toLowerCase();
  }

  isClipDocumentModalOpen = false;
  clipDocumentIncludeNutrition = false;

  scanDocument() {
    this.clipDocumentIncludeNutrition = false;
    this.isClipDocumentModalOpen = true;
  }

  submitClipDocument() {
    const includeNutrition = this.clipDocumentIncludeNutrition;
    this.isClipDocumentModalOpen = false;
    this._scanDocument(includeNutrition);
  }

  async _scanDocument(includeNutrition: boolean) {
    let filePickerResult: PickFilesResult;
    try {
      filePickerResult = await FilePicker.pickFiles({
        types: this.SUPPORTED_DOCUMENT_MIME_TYPES,
        limit: 1,
      });
    } catch (e) {
      return;
    }

    const file = filePickerResult.files.at(0);
    if (!file) return;

    const extension = this.getDocumentExtension(file.name);

    const pleaseWait = await this.translate
      .get("pages.editRecipe.clip.loading")
      .toPromise();
    const failedHeader = await this.translate.get("generic.error").toPromise();
    const failedMessage = await this.translate
      .get("pages.editRecipe.clip.failed")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();

    const blob = await (async () => {
      if (file.blob) return file.blob;

      const webPath = Capacitor.convertFileSrc(file.path!);
      const response = await fetch(webPath);
      return response.blob();
    })();
    const webFile = new File([blob], `scan${extension}`, {
      type: file.mimeType || "application/octet-stream",
    });

    const errorHandlers = {
      ...this.getSelfhostErrorHandlers(),
      400: async () => {
        (
          await this.alertCtrl.create({
            header: failedHeader,
            message: failedMessage,
            buttons: [
              {
                text: okay,
              },
            ],
          })
        ).present();
      },
    };

    const response =
      extension === ".pdf"
        ? await this.mlService.getRecipeFromPDF(webFile, errorHandlers)
        : await this.mlService.getRecipeFromDocument(webFile, errorHandlers);

    if (!response.success) {
      loading.dismiss();
      return;
    }

    this.recipe.title = response.data.recipe.title || "";
    this.recipe.description = response.data.recipe.description || "";
    this.recipe.source = response.data.recipe.source || "";
    this.recipe.yield = response.data.recipe.yield || "";
    this.recipe.activeTime = response.data.recipe.activeTime || "";
    this.recipe.totalTime = response.data.recipe.totalTime || "";
    this.recipe.ingredients = response.data.recipe.ingredients || "";
    this.recipe.instructions = response.data.recipe.instructions || "";
    this.recipe.notes = response.data.recipe.notes || "";

    if (includeNutrition && response.data.recipe.nutritionInfo) {
      await this.parseAndApplyNutrition(response.data.recipe.nutritionInfo);
    }

    loading.dismiss();
  }

  async scanImage() {
    const MAX_IMAGES_SCAN = 3;

    const capturedPhotos: Photo[] = [];
    while (true) {
      try {
        capturedPhotos.push(
          await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Prompt,
            direction: CameraDirection.Rear,
            quality: 85,
            allowEditing: true,
            width: 2160,
            webUseInput: true,
          }),
        );

        if (capturedPhotos.length >= MAX_IMAGES_SCAN) break;

        const header = await this.translate
          .get("pages.editRecipe.clipImage.selectMore.header")
          .toPromise();
        const message = await this.translate
          .get("pages.editRecipe.clipImage.selectMore.message", {
            maxCount: MAX_IMAGES_SCAN,
          })
          .toPromise();
        const yes = await this.translate.get("generic.yes").toPromise();
        const no = await this.translate.get("generic.no").toPromise();
        const clipPrompt = await this.alertCtrl.create({
          header,
          message,
          buttons: [
            {
              text: yes,
              role: "yes",
            },
            {
              text: no,
              role: "no",
            },
          ],
        });

        await clipPrompt.present();
        const result = await clipPrompt.onDidDismiss();
        if (result.role === "no") break;
      } catch (e) {
        break;
      }
    }

    if (!capturedPhotos.length) return;

    const pleaseWait = await this.translate
      .get("pages.editRecipe.clip.loading")
      .toPromise();
    const failedHeader = await this.translate.get("generic.error").toPromise();
    const failedMessage = await this.translate
      .get("pages.editRecipe.clip.failed")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();

    const files: File[] = [];
    for (const capturedPhoto of capturedPhotos) {
      const blob = await (async () => {
        const webPath = capturedPhoto.webPath
          ? capturedPhoto.webPath
          : Capacitor.convertFileSrc(capturedPhoto.path!);
        const response = await fetch(webPath);
        return response.blob();
      })();
      const webFile = new File([blob], `scan.${capturedPhoto.format}`, {
        type: `image/${capturedPhoto.format}`,
      });
      files.push(webFile);
    }

    const response = await this.mlService.getRecipeFromOCR(files, {
      ...this.getSelfhostErrorHandlers(),
      400: async () => {
        (
          await this.alertCtrl.create({
            header: failedHeader,
            message: failedMessage,
            buttons: [
              {
                text: okay,
              },
            ],
          })
        ).present();
      },
    });

    loading.dismiss();

    if (!response.success) return;

    this.recipe.title = response.data.recipe.title || "";
    this.recipe.description = response.data.recipe.description || "";
    this.recipe.source = response.data.recipe.source || "";
    this.recipe.yield = response.data.recipe.yield || "";
    this.recipe.activeTime = response.data.recipe.activeTime || "";
    this.recipe.totalTime = response.data.recipe.totalTime || "";
    this.recipe.ingredients = response.data.recipe.ingredients || "";
    this.recipe.instructions = response.data.recipe.instructions || "";
    this.recipe.notes = response.data.recipe.notes || "";

    const imageResponse = await this.imageService.create(files[0], {
      "*": () => {},
    });

    if (imageResponse.success) {
      this.images.push(imageResponse.data);
    }
  }

  isClipTextModalOpen = false;
  clipTextInput = "";
  clipTextIncludeNutrition = false;

  clipFromText() {
    this.clipTextInput = "";
    this.clipTextIncludeNutrition = false;
    this.isClipTextModalOpen = true;
  }

  async submitClipText() {
    if (!this.clipTextInput || this.clipTextInput.length < 10) {
      const error = await this.translate.get("generic.error").toPromise();
      const invalid = await this.translate
        .get("pages.editRecipe.clipText.invalid")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();
      (
        await this.alertCtrl.create({
          header: error,
          message: invalid,
          buttons: [{ text: okay }],
        })
      ).present();
      return;
    }
    this.isClipTextModalOpen = false;
    this._clipFromText(this.clipTextInput, this.clipTextIncludeNutrition);
  }

  async _clipFromText(text: string, includeNutrition: boolean) {
    const pleaseWait = await this.translate
      .get("pages.editRecipe.clip.loading")
      .toPromise();
    const failedHeader = await this.translate.get("generic.error").toPromise();
    const failedMessage = await this.translate
      .get("pages.editRecipe.clip.failed")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();
    const response = await this.serverActionsService.ml.getRecipeFromText(
      {
        text,
      },
      {
        ...this.getSelfhostErrorHandlers(),
        400: async () => {
          (
            await this.alertCtrl.create({
              header: failedHeader,
              message: failedMessage,
              buttons: [
                {
                  text: okay,
                },
              ],
            })
          ).present();
        },
      },
    );

    if (!response) {
      loading.dismiss();
      return;
    }

    this.recipe.title = response.recipe.title || "";
    this.recipe.description = response.recipe.description || "";
    this.recipe.source = response.recipe.source || "";
    this.recipe.yield = response.recipe.yield || "";
    this.recipe.activeTime = response.recipe.activeTime || "";
    this.recipe.totalTime = response.recipe.totalTime || "";
    this.recipe.ingredients = response.recipe.ingredients || "";
    this.recipe.instructions = response.recipe.instructions || "";
    this.recipe.notes = response.recipe.notes || "";

    if (includeNutrition && response.recipe.nutritionInfo) {
      await this.parseAndApplyNutrition(response.recipe.nutritionInfo);
    }

    loading.dismiss();
  }

  isClipUrlModalOpen = false;
  clipUrlInput = "";
  clipUrlIncludeNutrition = false;

  clipFromUrl() {
    this.clipUrlInput = "";
    this.clipUrlIncludeNutrition = false;
    this.isClipUrlModalOpen = true;
  }

  async submitClipUrl() {
    if (!this.clipUrlInput || !this.isValidHttpUrl(this.clipUrlInput)) {
      const error = await this.translate.get("generic.error").toPromise();
      const invalidUrl = await this.translate
        .get("pages.editRecipe.clipURL.invalidUrl")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();
      (
        await this.alertCtrl.create({
          header: error,
          message: invalidUrl,
          buttons: [{ text: okay }],
        })
      ).present();
      return;
    }
    if (this.isUnsupportedSiteUrl(this.clipUrlInput)) {
      const warning = await this.translate.get("generic.warning").toPromise();
      const unsupportedSiteUrl = await this.translate
        .get("pages.editRecipe.clipURL.unsupportedSiteUrl")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();
      const url = this.clipUrlInput;
      const includeNutrition = this.clipUrlIncludeNutrition;
      this.isClipUrlModalOpen = false;
      (
        await this.alertCtrl.create({
          header: warning,
          message: unsupportedSiteUrl,
          buttons: [
            {
              text: okay,
              handler: () => {
                this._clipFromUrl(url, includeNutrition);
              },
            },
          ],
        })
      ).present();
      return;
    }
    const url = this.clipUrlInput;
    const includeNutrition = this.clipUrlIncludeNutrition;
    this.isClipUrlModalOpen = false;
    this._clipFromUrl(url, includeNutrition);
  }

  async _clipFromUrl(url: string, includeNutrition = false) {
    const pleaseWait = await this.translate
      .get("pages.editRecipe.clip.loading")
      .toPromise();
    const failedHeader = await this.translate.get("generic.error").toPromise();
    const failedMessage = await this.translate
      .get("pages.editRecipe.clip.failed")
      .toPromise();
    const okay = await this.translate.get("generic.ok").toPromise();

    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();
    const response = await this.serverActionsService.ml.clipFromUrl(
      {
        url,
      },
      {
        400: async () => {
          (
            await this.alertCtrl.create({
              header: failedHeader,
              message: failedMessage,
              buttons: [
                {
                  text: okay,
                },
              ],
            })
          ).present();
        },
      },
    );
    if (!response) {
      loading.dismiss();
      return;
    }

    this.recipe.title = response.title || "";
    this.recipe.description = response.description || "";
    this.recipe.source = response.source || "";
    this.recipe.yield = response.yield || "";
    this.recipe.activeTime = response.activeTime || "";
    this.recipe.totalTime = response.totalTime || "";
    this.recipe.ingredients = response.ingredients || "";
    this.recipe.instructions = response.instructions || "";
    this.recipe.notes = response.notes || "";
    this.recipe.url = url;

    if (includeNutrition && response.nutritionInfo) {
      await this.parseAndApplyNutrition(response.nutritionInfo);
    }

    if (!this.recipe.ingredients?.trim() && !this.recipe.instructions?.trim()) {
      const emptyResultMessage = await this.translate
        .get("pages.editRecipe.clip.emptyResult")
        .toPromise();
      (
        await this.alertCtrl.create({
          header: failedHeader,
          message: emptyResultMessage,
          buttons: [
            {
              text: okay,
            },
          ],
        })
      ).present();
    }

    if (response.imageURL?.trim().length) {
      const IMAGE_LOADING_TIMEOUT = 3000;

      // Handle very long image fetch. Dismiss loading overlay if image import takes too long.
      await Promise.race([
        new Promise((resolve) => setTimeout(resolve, IMAGE_LOADING_TIMEOUT)),
        (async () => {
          const imageResponse =
            await this.serverActionsService.images.createRecipeImageFromUrl(
              {
                url: response.imageURL,
              },
              {
                "*": () => {},
              },
            );
          if (imageResponse) this.images.push(imageResponse);
        })(),
      ]);
    }

    loading.dismiss();
  }

  isAddImageByUrlModalOpen = false;
  addImageByUrlInput = "";

  addImageByUrlPrompt() {
    this.addImageByUrlInput = "";
    this.isAddImageByUrlModalOpen = true;
  }

  submitAddImageByUrl() {
    const imageUrl = this.addImageByUrlInput;
    this.isAddImageByUrlModalOpen = false;
    if (imageUrl) this._addImageByUrlPrompt(imageUrl);
  }

  async _addImageByUrlPrompt(imageUrl: string) {
    imageUrl = imageUrl.trim();
    if (!imageUrl) return;

    if (this.isValidHttpUrl(imageUrl)) {
      const downloading = await this.translate
        .get("pages.editRecipe.addImage.downloading")
        .toPromise();

      const loading = await this.loadingCtrl.create({
        message: downloading,
      });
      await loading.present();

      const response =
        await this.serverActionsService.images.createRecipeImageFromUrl({
          url: imageUrl,
        });
      if (response) this.images.push(response);

      loading.dismiss();
    } else {
      const header = await this.translate.get("generic.error").toPromise();
      const invalidUrl = await this.translate
        .get("pages.editRecipe.addImage.invalidUrl")
        .toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const invalidUrlToast = await this.alertCtrl.create({
        header,
        message: invalidUrl,
        buttons: [
          {
            text: okay,
          },
        ],
      });
      invalidUrlToast.present();
    }
  }

  async presentPopover(event: Event) {
    const canAddImages =
      this.images.length < 10 &&
      (this.images.length === 0 ||
        this.capabilitiesService.capabilities.multipleImages);

    const popover = await this.popoverCtrl.create({
      component: EditRecipePopoverPage,
      componentProps: {
        canAddImages,
        addImageByUrlPrompt: this.addImageByUrlPrompt.bind(this),
      },
      event,
    });

    await popover.present();
  }

  mapLabelsToSelectableItems(labels: LabelSummary[]) {
    const mapped = labels.map((label) => ({
      id: label.id,
      title: label.title,
      icon: "pricetag-outline",
    }));

    return mapped;
  }

  // Note that this is, in effect, just a change for the correlated group
  selectedLabelsChange(
    labelGroupId: string | null,
    updatedSelectedLabelsForGroup: SelectableItem[],
  ) {
    const labelsById = this.labels.reduce(
      (acc, label) => {
        acc[label.id] = label;
        return acc;
      },
      {} as Record<string, LabelSummary>,
    );

    const unrelatedSelectedLabels = this.selectedLabels.filter(
      (selectedLabel) => {
        return selectedLabel.labelGroupId !== labelGroupId;
      },
    );

    const unrelatedAndChangedLabels = [
      ...unrelatedSelectedLabels,
      ...updatedSelectedLabelsForGroup,
    ];
    this.selectedLabels = unrelatedAndChangedLabels
      .map((selectedLabel) => labelsById[selectedLabel.id])
      .filter((label) => label);
  }

  async addLabel(title: string, labelGroupId: string | null) {
    if (!title.trim()) return;

    const label = await this.serverActionsService.labels.createLabel({
      title,
      labelGroupId,
    });
    if (!label) return;

    this.labels.push(label);
    this.selectedLabels.push(label);
  }

  setLastMadeAtToday() {
    this.recipe.lastMadeAt = dayjs().format("YYYY-MM-DD");
  }

  linkedRecipeSelected(recipe: RecipeSummary | undefined) {
    if (!recipe) return;

    const alreadyLinked = this.selectedLinkedRecipes.find(
      (r) => r.id === recipe.id,
    );
    if (alreadyLinked) return;

    if (recipe.id === this.recipeId) {
      return;
    }

    this.selectedLinkedRecipes.push(recipe);
    this.markAsDirty();
  }

  removeLinkedRecipe(recipeId: string) {
    this.selectedLinkedRecipes = this.selectedLinkedRecipes.filter(
      (r) => r.id !== recipeId,
    );
    this.markAsDirty();
  }
}
