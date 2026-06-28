import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import {
  NavController,
  AlertController,
  ToastController,
  type AccordionGroupChangeEventDetail,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import type { ImageSummary } from "@recipesage/prisma";

import { RouteMap } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { UnsavedChangesService } from "../../../services/unsaved-changes.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import type {
  RouterInputs,
  RouterOutputs,
} from "../../../services/server-actions/actions-base";
import {
  getDiscoverLanguageOptions,
  localeToDiscoverLanguage,
  DiscoverLanguageOption,
} from "../../../utils/discoverLanguages";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { TextInputComponent } from "../../../components/forms/text-input/text-input.component";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import { MultiImageUploadComponent } from "../../../components/multi-image-upload/multi-image-upload.component";
import { RecipeFormatToolbarComponent } from "../../../components/recipe-format-toolbar/recipe-format-toolbar.component";
import { SelectDiscoverRecipeComponent } from "../../../components/select-discover-recipe/select-discover-recipe.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonBadge,
  IonCheckbox,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonAccordionGroup,
  IonAccordion,
  IonAvatar,
  IonIcon,
} from "@ionic/angular/standalone";
import { closeCircle } from "ionicons/icons";
import { addIcons } from "ionicons";

type DiscoverContent =
  RouterInputs["discover"]["publishDiscoverRecipe"]["content"];

type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];

interface LinkedDiscoverRecipe {
  id: string;
  title: string;
  images: { location: string }[];
}

interface NutritionSource {
  nutritionServingSize: string | null;
  nutritionCalories: number | null;
  nutritionTotalFat: number | null;
  nutritionSaturatedFat: number | null;
  nutritionTransFat: number | null;
  nutritionPolyunsaturatedFat: number | null;
  nutritionMonounsaturatedFat: number | null;
  nutritionCholesterol: number | null;
  nutritionSodium: number | null;
  nutritionTotalCarbs: number | null;
  nutritionDietaryFiber: number | null;
  nutritionTotalSugars: number | null;
  nutritionAddedSugars: number | null;
  nutritionProtein: number | null;
  nutritionVitaminD: number | null;
  nutritionCalcium: number | null;
  nutritionIron: number | null;
  nutritionPotassium: number | null;
  nutritionOtherDetails: string | null;
}

interface ContentSource extends NutritionSource {
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  notes: string;
  ingredients: string;
  instructions: string;
}

type NutritionNumberValue = string | number | null | undefined;

interface PublishRecipeForm {
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  ingredients: string;
  instructions: string;
  notes: string;
  nutritionServingSize: string | null | undefined;
  nutritionCalories: NutritionNumberValue;
  nutritionTotalFat: NutritionNumberValue;
  nutritionSaturatedFat: NutritionNumberValue;
  nutritionTransFat: NutritionNumberValue;
  nutritionPolyunsaturatedFat: NutritionNumberValue;
  nutritionMonounsaturatedFat: NutritionNumberValue;
  nutritionCholesterol: NutritionNumberValue;
  nutritionSodium: NutritionNumberValue;
  nutritionTotalCarbs: NutritionNumberValue;
  nutritionDietaryFiber: NutritionNumberValue;
  nutritionTotalSugars: NutritionNumberValue;
  nutritionAddedSugars: NutritionNumberValue;
  nutritionProtein: NutritionNumberValue;
  nutritionVitaminD: NutritionNumberValue;
  nutritionCalcium: NutritionNumberValue;
  nutritionIron: NutritionNumberValue;
  nutritionPotassium: NutritionNumberValue;
  nutritionOtherDetails: string | null | undefined;
}

const emptyForm = (): PublishRecipeForm => ({
  title: "",
  description: "",
  yield: "",
  activeTime: "",
  totalTime: "",
  ingredients: "",
  instructions: "",
  notes: "",
  nutritionServingSize: null,
  nutritionCalories: null,
  nutritionTotalFat: null,
  nutritionSaturatedFat: null,
  nutritionTransFat: null,
  nutritionPolyunsaturatedFat: null,
  nutritionMonounsaturatedFat: null,
  nutritionCholesterol: null,
  nutritionSodium: null,
  nutritionTotalCarbs: null,
  nutritionDietaryFiber: null,
  nutritionTotalSugars: null,
  nutritionAddedSugars: null,
  nutritionProtein: null,
  nutritionVitaminD: null,
  nutritionCalcium: null,
  nutritionIron: null,
  nutritionPotassium: null,
  nutritionOtherDetails: null,
});

@Component({
  standalone: true,
  selector: "page-publish-discover-recipe",
  templateUrl: "publish-discover-recipe.page.html",
  styleUrls: ["publish-discover-recipe.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    TextInputComponent,
    TextAreaComponent,
    MultiImageUploadComponent,
    RecipeFormatToolbarComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonItem,
    IonLabel,
    IonBadge,
    IonCheckbox,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonAccordionGroup,
    IonAccordion,
    IonAvatar,
    IonIcon,
    SelectDiscoverRecipeComponent,
  ],
})
export class PublishDiscoverRecipePage {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private unsavedChangesService = inject(UnsavedChangesService);
  private serverActionsService = inject(ServerActionsService);

  languageOptions: DiscoverLanguageOption[] = [];

  isEditMode = false;
  recipeId?: string;
  discoverRecipeId?: string;
  defaultBackHref = RouteMap.DiscoverPage.getPath();

  saving = false;
  agreedToTos = false;
  legalHref = RouteMap.LegalPage.getPath();
  nutritionAccordionValue: string | null = null;

  images: ImageSummary[] = [];
  language = "";
  form: PublishRecipeForm = emptyForm();
  selectedLinkedRecipes: LinkedDiscoverRecipe[] = [];

  constructor() {
    addIcons({ closeCircle });
    this.languageOptions = getDiscoverLanguageOptions(
      this.translate.currentLang,
    );
    this.applyRouteParams();
    this.load();
  }

  get linkExcludeIds(): string[] {
    const ids = this.selectedLinkedRecipes.map((recipe) => recipe.id);
    if (this.discoverRecipeId) ids.push(this.discoverRecipeId);
    return ids;
  }

  addLinkedRecipe(recipe: DiscoverRecipeSummary) {
    if (
      this.selectedLinkedRecipes.some((existing) => existing.id === recipe.id)
    ) {
      return;
    }
    if (this.discoverRecipeId === recipe.id) return;

    this.selectedLinkedRecipes.push({
      id: recipe.id,
      title: recipe.title,
      images: recipe.discoverRecipeImages.map((discoverRecipeImage) => ({
        location: discoverRecipeImage.image.location,
      })),
    });
    this.markAsDirty();
  }

  removeLinkedRecipe(id: string) {
    this.selectedLinkedRecipes = this.selectedLinkedRecipes.filter(
      (recipe) => recipe.id !== id,
    );
    this.markAsDirty();
  }

  private applyRouteParams() {
    const recipeId = this.route.snapshot.paramMap.get("recipeId");
    const discoverRecipeId =
      this.route.snapshot.paramMap.get("discoverRecipeId");

    if (discoverRecipeId) {
      this.isEditMode = true;
      this.discoverRecipeId = discoverRecipeId;
      this.defaultBackHref =
        RouteMap.DiscoverRecipePage.getPath(discoverRecipeId);
    } else if (recipeId) {
      this.isEditMode = false;
      this.recipeId = recipeId;
      this.defaultBackHref = RouteMap.RecipePage.getPath(recipeId);
    } else {
      this.navCtrl.navigateRoot(RouteMap.DiscoverPage.getPath());
      throw new Error("No recipeId or discoverRecipeId was provided");
    }

    this.language = localeToDiscoverLanguage(this.translate.currentLang);
  }

  async load() {
    if (this.isEditMode) {
      await this.loadDiscoverRecipe();
    } else {
      await this.loadSourceRecipe();
    }
  }

  private applySource(source: ContentSource) {
    this.form = {
      title: source.title,
      description: source.description,
      yield: source.yield,
      activeTime: source.activeTime,
      totalTime: source.totalTime,
      ingredients: source.ingredients,
      instructions: source.instructions,
      notes: source.notes,
      nutritionServingSize: source.nutritionServingSize,
      nutritionCalories: source.nutritionCalories,
      nutritionTotalFat: source.nutritionTotalFat,
      nutritionSaturatedFat: source.nutritionSaturatedFat,
      nutritionTransFat: source.nutritionTransFat,
      nutritionPolyunsaturatedFat: source.nutritionPolyunsaturatedFat,
      nutritionMonounsaturatedFat: source.nutritionMonounsaturatedFat,
      nutritionCholesterol: source.nutritionCholesterol,
      nutritionSodium: source.nutritionSodium,
      nutritionTotalCarbs: source.nutritionTotalCarbs,
      nutritionDietaryFiber: source.nutritionDietaryFiber,
      nutritionTotalSugars: source.nutritionTotalSugars,
      nutritionAddedSugars: source.nutritionAddedSugars,
      nutritionProtein: source.nutritionProtein,
      nutritionVitaminD: source.nutritionVitaminD,
      nutritionCalcium: source.nutritionCalcium,
      nutritionIron: source.nutritionIron,
      nutritionPotassium: source.nutritionPotassium,
      nutritionOtherDetails: source.nutritionOtherDetails,
    };
    this.nutritionAccordionValue = this.hasNutrition() ? "nutrition" : null;
  }

  private async loadSourceRecipe() {
    if (!this.recipeId) return;

    const loading = this.loadingService.start();
    const response = await this.serverActionsService.recipes.getRecipe({
      id: this.recipeId,
    });
    loading.dismiss();
    if (!response) return;

    if (response.source || response.url) {
      this.showIneligibleAlert();
      return;
    }

    this.applySource(response);
    this.images = response.recipeImages
      .sort((a, b) => a.order - b.order)
      .map((recipeImage) => recipeImage.image);
  }

  private async loadDiscoverRecipe() {
    if (!this.discoverRecipeId) return;

    const loading = this.loadingService.start();
    const response = await this.serverActionsService.discover.getDiscoverRecipe(
      {
        id: this.discoverRecipeId,
      },
    );
    loading.dismiss();
    if (!response) return;

    this.applySource(response);
    this.images = response.discoverRecipeImages.map((discoverRecipeImage) => ({
      id: discoverRecipeImage.image.id,
      location: discoverRecipeImage.image.location,
    }));
    this.language = response.language;
    this.selectedLinkedRecipes = response.linkedRecipes.map((linkedRecipe) => ({
      id: linkedRecipe.id,
      title: linkedRecipe.title,
      images: linkedRecipe.discoverRecipeImages.map((discoverRecipeImage) => ({
        location: discoverRecipeImage.image.location,
      })),
    }));
  }

  private async showIneligibleAlert() {
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
          handler: () => {
            this.navCtrl.navigateBack(this.defaultBackHref);
          },
        },
      ],
    });
    alert.present();
  }

  private toNutritionNumber(value: NutritionNumberValue): number | null {
    if (value == null || value === "") return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private nutritionNumberValues(): NutritionNumberValue[] {
    return [
      this.form.nutritionCalories,
      this.form.nutritionTotalFat,
      this.form.nutritionSaturatedFat,
      this.form.nutritionTransFat,
      this.form.nutritionPolyunsaturatedFat,
      this.form.nutritionMonounsaturatedFat,
      this.form.nutritionCholesterol,
      this.form.nutritionSodium,
      this.form.nutritionTotalCarbs,
      this.form.nutritionDietaryFiber,
      this.form.nutritionTotalSugars,
      this.form.nutritionAddedSugars,
      this.form.nutritionProtein,
      this.form.nutritionVitaminD,
      this.form.nutritionCalcium,
      this.form.nutritionIron,
      this.form.nutritionPotassium,
    ];
  }

  hasNutrition(): boolean {
    return [
      ...this.nutritionNumberValues(),
      this.form.nutritionServingSize,
      this.form.nutritionOtherDetails,
    ].some((value) => value != null && value !== "");
  }

  nutritionFieldCount(): number {
    return [
      ...this.nutritionNumberValues(),
      this.form.nutritionServingSize,
      this.form.nutritionOtherDetails,
    ].filter((value) => value != null && value !== "").length;
  }

  onNutritionAccordionChange(
    event: CustomEvent<AccordionGroupChangeEventDetail>,
  ) {
    if (event.target !== event.currentTarget) return;
    const value = event.detail.value;
    this.nutritionAccordionValue = typeof value === "string" ? value : null;
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
    this.form.nutritionServingSize = null;
    this.form.nutritionCalories = null;
    this.form.nutritionTotalFat = null;
    this.form.nutritionSaturatedFat = null;
    this.form.nutritionTransFat = null;
    this.form.nutritionPolyunsaturatedFat = null;
    this.form.nutritionMonounsaturatedFat = null;
    this.form.nutritionCholesterol = null;
    this.form.nutritionSodium = null;
    this.form.nutritionTotalCarbs = null;
    this.form.nutritionDietaryFiber = null;
    this.form.nutritionTotalSugars = null;
    this.form.nutritionAddedSugars = null;
    this.form.nutritionProtein = null;
    this.form.nutritionVitaminD = null;
    this.form.nutritionCalcium = null;
    this.form.nutritionIron = null;
    this.form.nutritionPotassium = null;
    this.form.nutritionOtherDetails = null;
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

    const prompt = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
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
            const text = data.text;
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
            this.parseAndApplyNutrition(text);
          },
        },
      ],
    });

    await prompt.present();
  }

  private async parseAndApplyNutrition(text: string) {
    const loading = this.loadingService.start();
    const response = await this.serverActionsService.ml
      .getNutritionFromText({
        text,
      })
      .finally(() => loading.dismiss());
    if (!response) return;

    this.form.nutritionServingSize = response.servingSize;
    this.form.nutritionCalories = response.calories;
    this.form.nutritionTotalFat = response.totalFat;
    this.form.nutritionSaturatedFat = response.saturatedFat;
    this.form.nutritionTransFat = response.transFat;
    this.form.nutritionPolyunsaturatedFat = response.polyunsaturatedFat;
    this.form.nutritionMonounsaturatedFat = response.monounsaturatedFat;
    this.form.nutritionCholesterol = response.cholesterol;
    this.form.nutritionSodium = response.sodium;
    this.form.nutritionTotalCarbs = response.totalCarbs;
    this.form.nutritionDietaryFiber = response.dietaryFiber;
    this.form.nutritionTotalSugars = response.totalSugars;
    this.form.nutritionAddedSugars = response.addedSugars;
    this.form.nutritionProtein = response.protein;
    this.form.nutritionVitaminD = response.vitaminD;
    this.form.nutritionCalcium = response.calcium;
    this.form.nutritionIron = response.iron;
    this.form.nutritionPotassium = response.potassium;
    this.nutritionAccordionValue = "nutrition";
    this.markAsDirty();
  }

  private buildContent(): DiscoverContent {
    return {
      title: this.form.title,
      description: this.form.description,
      yield: this.form.yield,
      activeTime: this.form.activeTime,
      totalTime: this.form.totalTime,
      notes: this.form.notes,
      ingredients: this.form.ingredients,
      instructions: this.form.instructions,
      nutritionServingSize: this.form.nutritionServingSize || null,
      nutritionCalories: this.toNutritionNumber(this.form.nutritionCalories),
      nutritionTotalFat: this.toNutritionNumber(this.form.nutritionTotalFat),
      nutritionSaturatedFat: this.toNutritionNumber(
        this.form.nutritionSaturatedFat,
      ),
      nutritionTransFat: this.toNutritionNumber(this.form.nutritionTransFat),
      nutritionPolyunsaturatedFat: this.toNutritionNumber(
        this.form.nutritionPolyunsaturatedFat,
      ),
      nutritionMonounsaturatedFat: this.toNutritionNumber(
        this.form.nutritionMonounsaturatedFat,
      ),
      nutritionCholesterol: this.toNutritionNumber(
        this.form.nutritionCholesterol,
      ),
      nutritionSodium: this.toNutritionNumber(this.form.nutritionSodium),
      nutritionTotalCarbs: this.toNutritionNumber(
        this.form.nutritionTotalCarbs,
      ),
      nutritionDietaryFiber: this.toNutritionNumber(
        this.form.nutritionDietaryFiber,
      ),
      nutritionTotalSugars: this.toNutritionNumber(
        this.form.nutritionTotalSugars,
      ),
      nutritionAddedSugars: this.toNutritionNumber(
        this.form.nutritionAddedSugars,
      ),
      nutritionProtein: this.toNutritionNumber(this.form.nutritionProtein),
      nutritionVitaminD: this.toNutritionNumber(this.form.nutritionVitaminD),
      nutritionCalcium: this.toNutritionNumber(this.form.nutritionCalcium),
      nutritionIron: this.toNutritionNumber(this.form.nutritionIron),
      nutritionPotassium: this.toNutritionNumber(this.form.nutritionPotassium),
      nutritionOtherDetails: this.form.nutritionOtherDetails || null,
    };
  }

  canSubmit() {
    if (this.saving) return false;
    if (!this.form.title.trim()) return false;
    if (!this.isEditMode && !this.agreedToTos) return false;
    return true;
  }

  markAsDirty() {
    this.unsavedChangesService.setPendingChanges();
  }

  markAsClean() {
    this.unsavedChangesService.clearPendingChanges();
  }

  async submit() {
    if (!this.canSubmit()) return;

    if (this.isEditMode) {
      await this.submitEdit();
    } else {
      await this.submitPublish();
    }
  }

  private async submitPublish() {
    if (!this.recipeId) return;

    const loading = this.loadingService.start();
    this.saving = true;

    const response = await this.serverActionsService.discover
      .publishDiscoverRecipe({
        recipeId: this.recipeId,
        content: this.buildContent(),
        language: this.language,
        imageIds: this.images.map((image) => image.id),
        linkedDiscoverRecipeIds: this.selectedLinkedRecipes.map(
          (recipe) => recipe.id,
        ),
        agreedToTos: true,
      })
      .finally(() => {
        loading.dismiss();
        this.saving = false;
      });

    if (!response) return;

    this.markAsClean();
    await this.presentToast("pages.publishDiscoverRecipe.publishSuccess");
    this.navCtrl.navigateForward(
      RouteMap.DiscoverRecipePage.getPath(response.id),
      { replaceUrl: true },
    );
  }

  private async submitEdit() {
    if (!this.discoverRecipeId) return;

    const loading = this.loadingService.start();
    this.saving = true;

    const response = await this.serverActionsService.discover
      .updateDiscoverRecipe({
        id: this.discoverRecipeId,
        content: this.buildContent(),
        language: this.language,
        imageIds: this.images.map((image) => image.id),
        linkedDiscoverRecipeIds: this.selectedLinkedRecipes.map(
          (recipe) => recipe.id,
        ),
      })
      .finally(() => {
        loading.dismiss();
        this.saving = false;
      });

    if (!response) return;

    this.markAsClean();
    await this.presentToast("pages.publishDiscoverRecipe.editSuccess");
    this.navCtrl.navigateBack(RouteMap.DiscoverRecipePage.getPath(response.id));
  }

  private async presentToast(messageKey: string) {
    const message = await this.translate.get(messageKey).toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    toast.present();
  }
}
