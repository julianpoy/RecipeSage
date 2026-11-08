import {
  Component,
  Input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { System } from "@recipesage/unitz-ts";
import {
  applyDecimalNotation,
  decodeBasicHtmlEntities,
  inferRecipeNotation,
  parseIngredients,
  parseInstructions,
  parseNotes,
} from "@recipesage/util/shared";

import { ServerActionsService } from "../../services/server-actions.service";
import type { UserPublic, RecipeSummary } from "@recipesage/prisma";
import type { UnitSystem } from "../../modals/scale-recipe/scale-recipe.component";
import { LoadingService } from "../../services/loading.service";
import {
  UtilService,
  RecipeTemplateModifiers,
  RouteMap,
} from "../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SelectUserKnownUserComponent } from "../../components/select-user-knownuser/select-user-knownuser.component";
import { CopyWithWebshareComponent } from "../../components/copy-with-webshare/copy-with-webshare.component";
import { RecipePreviewComponent } from "../../components/recipe-preview/recipe-preview.component";
import { TextInputComponent } from "../../components/forms/text-input/text-input.component";
import { getShareLinkOrigin } from "../../utils/serverConfig";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  IonFooter,
  IonItemGroup,
  IonNote,
  type SegmentCustomEvent,
} from "@ionic/angular";
import {
  calendarOutline,
  closeOutline,
  codeWorkingOutline,
  documentTextOutline,
  fitnessOutline,
  gitNetworkOutline,
  imageOutline,
  linkOutline,
  printOutline,
  sendOutline,
  starOutline,
  swapHorizontalOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";
import { serverConfig } from "../../utils/serverConfig";

@Component({
  standalone: true,
  selector: "page-share-modal",
  templateUrl: "share-modal.page.html",
  styleUrls: ["share-modal.page.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectUserKnownUserComponent,
    CopyWithWebshareComponent,
    RecipePreviewComponent,
    TextInputComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonToggle,
    IonFooter,
    IonItemGroup,
    IonNote,
  ],
})
export class ShareModalPage {
  navCtrl = inject(NavController);
  toastCtrl = inject(ToastController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  serverActionsService = inject(ServerActionsService);
  modalCtrl = inject(ModalController);
  translate = inject(TranslateService);

  @Input({
    required: true,
  })
  recipe!: RecipeSummary;
  @Input({
    required: true,
  })
  scale!: string;
  @Input() unitSystem: UnitSystem = "original";

  selectedUser?: UserPublic;
  recipientId?: string;

  shareMethod = "link";

  recipeURL?: string;
  recipeText?: string;

  enableJSONLD = true;
  embedHeight = "800";
  embedWidth = "600";
  embedConfig: RecipeTemplateModifiers = {
    verticalInstrIng: false,
    titleImage: true,
    hideNotes: false,
    hideSource: false,
    hideSourceURL: false,
    hideRating: false,
    hideNutrition: false,
    hideLinkedRecipes: false,
    showLastMade: false,
    showPrintButton: true,
  };
  recipePreviewURL?: string;
  recipeEmbedURL?: string;
  recipeEmbedCode?: string;

  constructor() {
    addIcons({
      calendarOutline,
      closeOutline,
      codeWorkingOutline,
      documentTextOutline,
      fitnessOutline,
      gitNetworkOutline,
      imageOutline,
      linkOutline,
      printOutline,
      sendOutline,
      starOutline,
      swapHorizontalOutline,
    });
    const origin = getShareLinkOrigin();

    setTimeout(() => {
      this.recipeURL = `${origin}/api/share/recipe/${this.recipe.id}`;

      this.updateEmbed(true);
      this.generateRecipeText();
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  async generateRecipeText() {
    const recipe = this.recipe;

    const targetSystem =
      this.unitSystem === "metric"
        ? System.METRIC
        : this.unitSystem === "imperial"
          ? System.US
          : undefined;
    const decimalNotationMode = inferRecipeNotation(
      recipe,
      this.utilService.getCurrentLocale(),
    );
    const parseOptions = { targetSystem, decimalNotationMode };

    const source = recipe.source.trim();
    const activeTime = recipe.activeTime.trim();
    const totalTime = recipe.totalTime.trim();
    const yieldText = recipe.yield.trim();

    const recipeDetailLines = [
      source &&
        (await this.translate
          .get("pages.share.byText.source", { source })
          .toPromise()),
      recipe.url.trim(),
      activeTime &&
        (await this.translate
          .get("pages.share.byText.activeTime", { activeTime })
          .toPromise()),
      totalTime &&
        (await this.translate
          .get("pages.share.byText.totalTime", { totalTime })
          .toPromise()),
      yieldText &&
        (await this.translate
          .get("pages.share.byText.yield", { yield: yieldText })
          .toPromise()),
    ].filter((line) => line);

    const ingredients = parseIngredients(
      decodeBasicHtmlEntities(recipe.ingredients),
      this.scale,
      parseOptions,
    )
      .map((ingredient) => ingredient.plaintextContent.trim())
      .join("\n")
      .trim();

    const imageStepText = await this.translate
      .get("pages.share.byText.imageStep")
      .toPromise();

    const instructions = parseInstructions(
      decodeBasicHtmlEntities(recipe.instructions),
      this.scale,
      parseOptions,
    )
      .map((instruction) => {
        const instructionText = instruction.plaintextContent.trim();
        return instruction.isHeader
          ? instructionText
          : `${instruction.count}. ${instructionText || imageStepText}`;
      })
      .filter((line) => line)
      .join("\n");

    const notes = parseNotes(
      decodeBasicHtmlEntities(recipe.notes),
      this.scale,
      parseOptions,
    )
      .map((note) => note.plaintextContent.trim())
      .join("\n")
      .trim();

    const scaleDisplay = applyDecimalNotation(this.scale, decimalNotationMode);
    const ingredientsHeading = await this.translate
      .get(
        this.scale === "1"
          ? "pages.recipeDetails.ingredients"
          : "printViews.recipe.ingredientsAtScale",
        { scale: scaleDisplay },
      )
      .toPromise();
    const scaleStatus = await this.translate
      .get("pages.recipeDetails.scaleStatus", { scale: scaleDisplay })
      .toPromise();
    const instructionsHeading = await this.translate
      .get("pages.recipeDetails.instructions")
      .toPromise();
    const notesHeading = await this.translate
      .get("pages.recipeDetails.notes")
      .toPromise();

    const sections = [
      [recipe.title.trim(), recipe.description.trim()]
        .filter((line) => line)
        .join("\n"),
      recipeDetailLines.join("\n"),
      this.scale !== "1" && !ingredients && (instructions || notes)
        ? scaleStatus
        : "",
      ingredients && `${ingredientsHeading}\n${ingredients}`,
      instructions && `${instructionsHeading}\n${instructions}`,
      notes && `${notesHeading}\n${notes}`,
    ];

    this.recipeText = sections.filter((section) => section).join("\n\n");
  }

  updateEmbed(updateURL?: boolean) {
    if (updateURL) {
      this.recipeEmbedURL = this.utilService.generateRecipeTemplateURL(
        this.recipe.id,
        this.embedConfig,
      );
      this.recipePreviewURL = this.recipeEmbedURL;
    }

    const jsonLDCode = `<script>
      fetch('${serverConfig.apiBase}recipes/${this.recipe.id}/json-ld')
      .then(response => response.text())
      .then(structuredDataText => {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.textContent = structuredDataText;
        document.head.appendChild(script);
      });
    </script>`;

    const iframeCode = `<iframe
      style="box-shadow: 1px 1px 14px rgb(100,100,100); border: none; height: ${this.embedHeight}px; width: ${this.embedWidth}px;"
      src="${this.recipeEmbedURL}"
      scrolling="auto"
      frameborder="0"></iframe>`;

    let embedCode = "";
    if (this.enableJSONLD) embedCode += `${jsonLDCode}\n`;
    embedCode += iframeCode;

    this.recipeEmbedCode = embedCode;
  }

  selectUser(user: UserPublic | undefined) {
    if (!user) {
      this.selectedUser = undefined;
      this.recipientId = undefined;
      return;
    }

    this.selectedUser = user;
    this.recipientId = user.id;
  }

  async send() {
    if (!this.recipientId) return;

    const loading = this.loadingService.start();

    const response = await this.serverActionsService.messages.createMessage({
      to: this.recipientId,
      body: "",
      recipeId: this.recipe.id,
    });
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
    this.navCtrl.navigateForward(
      RouteMap.MessageThreadPage.getPath(this.recipientId),
    );
  }

  shareMethodChanged(event: SegmentCustomEvent) {
    this.shareMethod = String(event.detail.value);
  }
}
