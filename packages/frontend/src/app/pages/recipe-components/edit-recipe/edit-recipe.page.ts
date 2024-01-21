import { Component } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { DomSanitizer } from "@angular/platform-browser";
import {
  NavController,
  ToastController,
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
  Photo,
} from "@capacitor/camera";

import { UtilService, RouteMap } from "~/services/util.service";
import { RecipeService, Recipe, BaseRecipe } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UnsavedChangesService } from "~/services/unsaved-changes.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { Image, ImageService } from "~/services/image.service";
import { getQueryParam } from "~/utils/queryParams";

import { EditRecipePopoverPage } from "../edit-recipe-popover/edit-recipe-popover.page";
import { LabelSummary } from "packages/trpc/src/types/labelSummary";
import { TRPCService } from "../../../services/trpc.service";
import { SelectableItem } from "../../../components/select-multiple-items/select-multiple-items.component";
import { LabelGroupSummary } from "packages/trpc/src/types/labelGroupSummary";
import { FeatureFlagService } from "../../../services/feature-flag.service";

@Component({
  selector: "page-edit-recipe",
  templateUrl: "edit-recipe.page.html",
  styleUrls: ["edit-recipe.page.scss"],
  providers: [RecipeService],
})
export class EditRecipePage {
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

  enableOCR = this.featureFlagService.flags.enableOCR;

  constructor(
    private route: ActivatedRoute,
    private translate: TranslateService,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController,
    private utilService: UtilService,
    private trpcService: TRPCService,
    private unsavedChangesService: UnsavedChangesService,
    private loadingCtrl: LoadingController,
    private loadingService: LoadingService,
    private recipeService: RecipeService,
    private imageService: ImageService,
    private capabilitiesService: CapabilitiesService,
    private featureFlagService: FeatureFlagService,
  ) {
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
    return this.trpcService.handle(
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
  }

  async _update(id: string, title: string) {
    return this.trpcService.handle(
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
  }

  async _save() {
    if (!this.recipe.title) return;

    const loading = this.loadingService.start();

    const response = await (this.recipe.id
      ? this._update(this.recipe.id, this.recipe.title)
      : this._create(this.recipe.title));

    loading.dismiss();
    if (!response) return;

    this.markAsClean();

    this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(response.id));
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
      const message = await this.translate
        .get("pages.editRecipe.titleRequired")
        .toPromise();

      (
        await this.toastCtrl.create({
          message,
          duration: 6000,
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

  async scan() {
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      direction: CameraDirection.Rear,
      quality: 100,
      allowEditing: true,
      width: 2160,
      webUseInput: true,
    });

    if (!capturedPhoto.base64String) {
      throw new Error("Photo did not return base64String");
    }

    const pleaseWait = await this.translate
      .get("pages.editRecipe.clip.loading")
      .toPromise();
    const loading = await this.loadingCtrl.create({
      message: pleaseWait,
    });
    await loading.present();

    const response = await this.trpcService.handle(
      this.trpcService.trpc.ml.getRecipeFromOCR.mutate({
        image: capturedPhoto.base64String,
      }),
    );

    loading.dismiss();

    if (!response) return;

    if (response.title) this.recipe.title = response.title;
    if (response.description) this.recipe.description = response.description;
    if (response.source) this.recipe.source = response.source;
    if (response.yield) this.recipe.yield = response.yield;
    if (response.activeTime) this.recipe.activeTime = response.activeTime;
    if (response.totalTime) this.recipe.totalTime = response.totalTime;
    if (response.ingredients) this.recipe.ingredients = response.ingredients;
    if (response.instructions) this.recipe.instructions = response.instructions;
    if (response.notes) this.recipe.notes = response.notes;

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

  async clipFromUrl() {
    const header = await this.translate
      .get("pages.editRecipe.clip.header")
      .toPromise();
    const message = await this.translate
      .get("pages.editRecipe.clip.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.editRecipe.clip.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();
    const invalidUrl = await this.translate
      .get("pages.editRecipe.clip.invalidUrl")
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
                await this.toastCtrl.create({
                  message: invalidUrl,
                  duration: 5000,
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
    const failed = await this.translate
      .get("pages.editRecipe.clip.failed")
      .toPromise();

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
            await this.toastCtrl.create({
              message: failed,
              duration: 5000,
            })
          ).present();
        },
      },
    );
    if (!response.success) {
      loading.dismiss();
      return;
    }

    if (response.data.title) this.recipe.title = response.data.title;
    if (response.data.description)
      this.recipe.description = response.data.description;
    if (response.data.source) this.recipe.source = response.data.source;
    if (response.data.yield) this.recipe.yield = response.data.yield;
    if (response.data.activeTime)
      this.recipe.activeTime = response.data.activeTime;
    if (response.data.totalTime)
      this.recipe.totalTime = response.data.totalTime;
    if (response.data.ingredients)
      this.recipe.ingredients = response.data.ingredients;
    if (response.data.instructions)
      this.recipe.instructions = response.data.instructions;
    if (response.data.notes) this.recipe.notes = response.data.notes;

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
      const invalidUrl = await this.translate
        .get("pages.editRecipe.addImage.invalidUrl")
        .toPromise();

      const invalidUrlToast = await this.toastCtrl.create({
        message: invalidUrl,
        duration: 5000,
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
