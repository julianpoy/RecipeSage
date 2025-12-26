import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import {
  NavController,
  AlertController,
  PopoverController,
  LoadingController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";

import { RouteMap } from "~/services/util.service";
import { RecipeService, Recipe, BaseRecipe } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UnsavedChangesService } from "~/services/unsaved-changes.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { Image, ImageService } from "~/services/image.service";
import { getQueryParam } from "~/utils/queryParams";

import { EditRecipePopoverPage } from "../edit-recipe-popover/edit-recipe-popover.page";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { TRPCService } from "../../../services/trpc.service";
import {
  SelectableItem,
  SelectMultipleItemsComponent,
} from "../../../components/select-multiple-items/select-multiple-items.component";
import { FeatureFlagService } from "../../../services/feature-flag.service";
import { IS_SELFHOST } from "@recipesage/frontend/src/environments/environment";
import { ErrorHandlers } from "../../../services/http-error-handler.service";
import { EventName, EventService } from "../../../services/event.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";
import { MultiImageUploadComponent } from "../../../components/multi-image-upload/multi-image-upload.component";

@Component({
  standalone: true,
  selector: "page-edit-recipe",
  templateUrl: "edit-recipe.page.html",
  styleUrls: ["edit-recipe.page.scss"],
  providers: [RecipeService],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectMultipleItemsComponent,
    RatingComponent,
    MultiImageUploadComponent,
  ],
})
export class EditRecipePage {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private navCtrl = inject(NavController);
  private alertCtrl = inject(AlertController);
  private popoverCtrl = inject(PopoverController);
  private trpcService = inject(TRPCService);
  private unsavedChangesService = inject(UnsavedChangesService);
  private loadingCtrl = inject(LoadingController);
  private loadingService = inject(LoadingService);
  private recipeService = inject(RecipeService);
  private imageService = inject(ImageService);
  private capabilitiesService = inject(CapabilitiesService);
  private events = inject(EventService);
  private featureFlagService = inject(FeatureFlagService);

  saving = false;
  defaultBackHref: string;

  recipeId?: string;
  originalTitle?: string;
  // TODO: Clean this up
  fullRecipe?: Recipe;
  recipe: Partial<BaseRecipe> & { id?: string } = {
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

  images: Image[] = [];
  labels: LabelSummary[] = [];
  labelGroups: LabelGroupSummary[] = [];
  selectedLabels: LabelSummary[] = [];

  isAutoclipPopoverOpen = false;

  constructor() {
    const recipeId = this.route.snapshot.paramMap.get("recipeId") || "new";

    if (recipeId === "new") {
      this.checkAutoClip();
    } else {
      this.recipeId = recipeId;
    }
    this.load();

    this.defaultBackHref = this.recipeId
      ? RouteMap.RecipePage.getPath(this.recipeId)
      : RouteMap.HomePage.getPath("main");
  }

  ionViewWillEnter() {}

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
      this.selectedLabels = this.fullRecipe.labels
        .map((label) => labelsById[label.id])
        .filter((label) => label);
    }

    loading.dismiss();
  }

  async _loadRecipe() {
    if (this.recipeId) {
      const response = await this.recipeService.fetchById(this.recipeId);

      if (response.success) {
        this.fullRecipe = response.data;
        this.recipe = response.data;
        this.images = response.data.images;
        this.originalTitle = response.data.title;
      }
    }
  }

  async _loadLabels() {
    const labels = await this.trpcService.handle(
      this.trpcService.trpc.labels.getLabels.query(),
    );
    if (labels) {
      this.labels = labels;
    }
  }

  async _loadLabelGroups() {
    const labelGroups = await this.trpcService.handle(
      this.trpcService.trpc.labelGroups.getLabelGroups.query(),
    );
    if (labelGroups) {
      this.labelGroups = labelGroups;
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
      /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))?/gi,
    );
    if (matchedUrl) return matchedUrl.pop();
  }

  async _create(title: string) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.createRecipe.mutate({
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
      }),
    );

    this.events.publish(EventName.RecipeCreated);

    return response;
  }

  async _update(id: string, title: string) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.recipes.updateRecipe.mutate({
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
      }),
    );

    this.events.publish(EventName.RecipeUpdated);

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

    const conflictingRecipes = await this.trpcService.handle(
      this.trpcService.trpc.recipes.getRecipesByTitle.query({
        title: this.recipe.title,
      }),
    );

    const uniqueTitle = await this.trpcService.handle(
      this.trpcService.trpc.recipes.getUniqueRecipeTitle.query({
        title: this.recipe.title,
        ignoreIds: this.recipe.id ? [this.recipe.id] : undefined,
      }),
    );

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

  async scanPDF() {
    let filePickerResult;
    try {
      filePickerResult = await FilePicker.pickFiles({
        types: ["application/pdf"],
        limit: 1,
        readData: true,
      });
    } catch (e) {
      return;
    }

    const file = filePickerResult.files.at(0);
    if (!file || !file.data) return;

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

    const response = await this.trpcService.handle(
      this.trpcService.trpc.ml.getRecipeFromPDF.mutate({
        pdf: file.data,
      }),
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

    loading.dismiss();

    if (!response) return;

    this.recipe.title = response.recipe.title || "";
    this.recipe.description = response.recipe.description || "";
    this.recipe.source = response.recipe.source || "";
    this.recipe.yield = response.recipe.yield || "";
    this.recipe.activeTime = response.recipe.activeTime || "";
    this.recipe.totalTime = response.recipe.totalTime || "";
    this.recipe.ingredients = response.recipe.ingredients || "";
    this.recipe.instructions = response.recipe.instructions || "";
    this.recipe.notes = response.recipe.notes || "";
  }

  async scanImage() {
    let capturedPhoto;

    try {
      capturedPhoto = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        direction: CameraDirection.Rear,
        quality: 100,
        allowEditing: true,
        width: 2160,
        webUseInput: true,
      });
    } catch (e) {
      return;
    }

    if (!capturedPhoto.base64String) {
      throw new Error("Photo did not return base64String");
    }

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

    const response = await this.trpcService.handle(
      this.trpcService.trpc.ml.getRecipeFromOCR.mutate({
        image: capturedPhoto.base64String,
      }),
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

    loading.dismiss();

    if (!response) return;

    this.recipe.title = response.recipe.title || "";
    this.recipe.description = response.recipe.description || "";
    this.recipe.source = response.recipe.source || "";
    this.recipe.yield = response.recipe.yield || "";
    this.recipe.activeTime = response.recipe.activeTime || "";
    this.recipe.totalTime = response.recipe.totalTime || "";
    this.recipe.ingredients = response.recipe.ingredients || "";
    this.recipe.instructions = response.recipe.instructions || "";
    this.recipe.notes = response.recipe.notes || "";

    const imageResponse = await this.imageService.createFromB64(
      {
        data: capturedPhoto.base64String,
      },
      {
        "*": () => {},
      },
    );

    if (imageResponse.success) {
      this.images.push(imageResponse.data);
    }
  }

  async clipFromText() {
    const header = await this.translate
      .get("pages.editRecipe.clipText.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.clipText.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.editRecipe.clipText.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();
    const error = await this.translate.get("generic.error").toPromise();
    const invalid = await this.translate
      .get("pages.editRecipe.clipText.invalid")
      .toPromise();

    const clipInputId = "autoclip-prompt-text-input";
    const clipPrompt = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          id: clipInputId,
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
                  buttons: [
                    {
                      text: okay,
                    },
                  ],
                })
              ).present();
              return;
            }
            this._clipFromText(text);
          },
        },
      ],
    });

    await clipPrompt.present();

    document.getElementById(clipInputId)?.focus();
  }

  async _clipFromText(text: string) {
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
    const response = await this.trpcService.handle(
      this.trpcService.trpc.ml.getRecipeFromText.mutate({
        text,
      }),
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

    loading.dismiss();
  }

  async clipFromUrl() {
    const header = await this.translate
      .get("pages.editRecipe.clipURL.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.clipURL.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.editRecipe.clipURL.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();
    const error = await this.translate.get("generic.error").toPromise();
    const invalidUrl = await this.translate
      .get("pages.editRecipe.clipURL.invalidUrl")
      .toPromise();
    const warning = await this.translate.get("generic.warning").toPromise();
    const unsupportedSiteUrl = await this.translate
      .get("pages.editRecipe.clipURL.unsupportedSiteUrl")
      .toPromise();

    const clipInputId = "autoclip-prompt-url-input";
    const clipPrompt = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          id: clipInputId,
          name: "url",
          type: "text",
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
            const { url } = data;
            if (!url || !this.isValidHttpUrl(url)) {
              (
                await this.alertCtrl.create({
                  header: error,
                  message: invalidUrl,
                  buttons: [
                    {
                      text: okay,
                    },
                  ],
                })
              ).present();
              return;
            }
            if (this.isUnsupportedSiteUrl(url)) {
              (
                await this.alertCtrl.create({
                  header: warning,
                  message: unsupportedSiteUrl,
                  buttons: [
                    {
                      text: okay,
                      handler: () => {
                        this._clipFromUrl(data.url);
                      },
                    },
                  ],
                })
              ).present();
              return;
            }
            this._clipFromUrl(data.url);
          },
        },
      ],
    });

    await clipPrompt.present();

    document.getElementById(clipInputId)?.focus();
  }

  async _clipFromUrl(url: string) {
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
    const response = await this.recipeService.clipFromUrl(
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
    if (!response.success) {
      loading.dismiss();
      return;
    }

    this.recipe.title = response.data.title || "";
    this.recipe.description = response.data.description || "";
    this.recipe.source = response.data.source || "";
    this.recipe.yield = response.data.yield || "";
    this.recipe.activeTime = response.data.activeTime || "";
    this.recipe.totalTime = response.data.totalTime || "";
    this.recipe.ingredients = response.data.ingredients || "";
    this.recipe.instructions = response.data.instructions || "";
    this.recipe.notes = response.data.notes || "";
    this.recipe.url = url;

    if (response.data.imageURL?.trim().length) {
      const IMAGE_LOADING_TIMEOUT = 3000;

      // Handle very long image fetch. Dismiss loading overlay if image import takes too long.
      await Promise.race([
        new Promise((resolve) => setTimeout(resolve, IMAGE_LOADING_TIMEOUT)),
        (async () => {
          const imageResponse = await this.imageService.createFromUrl(
            {
              url: response.data.imageURL,
            },
            {
              400: () => {},
              415: () => {},
              500: () => {},
            },
          );
          if (imageResponse.success) this.images.push(imageResponse.data);
        })(),
      ]);
    }

    loading.dismiss();
  }

  async addImageByUrlPrompt() {
    const header = await this.translate
      .get("pages.editRecipe.addImage.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.addImage.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.editRecipe.addImage.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate.get("generic.confirm").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          name: "imageUrl",
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
          handler: () => {},
        },
        {
          text: confirm,
          handler: (data) => {
            if (data.imageUrl) this._addImageByUrlPrompt(data.imageUrl);
          },
        },
      ],
    });

    await alert.present();
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

      const response = await this.imageService.createFromUrl({
        url: imageUrl,
      });
      if (response.success) this.images.push(response.data);

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
      icon: "pricetag",
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

    const label = await this.trpcService.handle(
      this.trpcService.trpc.labels.createLabel.mutate({
        title,
        labelGroupId,
      }),
    );
    if (!label) return;

    this.labels.push(label);
    this.selectedLabels.push(label);
  }
}
