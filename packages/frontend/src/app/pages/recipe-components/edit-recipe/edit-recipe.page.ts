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

import { UtilService, RouteMap } from "~/services/util.service";
import { RecipeService, Recipe, BaseRecipe } from "~/services/recipe.service";
import { LoadingService } from "~/services/loading.service";
import { UnsavedChangesService } from "~/services/unsaved-changes.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { Image, ImageService } from "~/services/image.service";
import { getQueryParam } from "~/utils/queryParams";

import { EditRecipePopoverPage } from "../edit-recipe-popover/edit-recipe-popover.page";

@Component({
  selector: "page-edit-recipe",
  templateUrl: "edit-recipe.page.html",
  styleUrls: ["edit-recipe.page.scss"],
  providers: [RecipeService],
})
export class EditRecipePage {
  defaultBackHref: string;

  recipeId?: string;
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

  constructor(
    public route: ActivatedRoute,
    public translate: TranslateService,
    public navCtrl: NavController,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public popoverCtrl: PopoverController,
    public utilService: UtilService,
    public unsavedChangesService: UnsavedChangesService,
    public loadingCtrl: LoadingController,
    public loadingService: LoadingService,
    public recipeService: RecipeService,
    public imageService: ImageService,
    public domSanitizationService: DomSanitizer,
    public capabilitiesService: CapabilitiesService
  ) {
    const recipeId = this.route.snapshot.paramMap.get("recipeId") || "new";

    if (recipeId === "new") {
      this.checkAutoClip();
    } else {
      this.recipeId = recipeId;

      const loading = this.loadingService.start();
      this.recipeService.fetchById(this.recipeId).then((response) => {
        loading.dismiss();
        if (!response.success) return;
        this.recipe = response.data;
        this.images = response.data.images;
      });
    }

    this.defaultBackHref = this.recipeId
      ? RouteMap.RecipePage.getPath(this.recipeId)
      : RouteMap.HomePage.getPath("main");
  }

  goToAuth(cb?: () => any) {
    // TODO: Needs functionality
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
      /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))?/gi
    );
    if (matchedUrl) return matchedUrl.pop();
  }

  async save() {
    if (!this.recipe.title || this.recipe.title.length === 0) {
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

    const loading = this.loadingService.start();

    const response = this.recipe.id
      ? await this.recipeService.update({
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
          imageIds: this.images.map((image) => image.id),
        })
      : await this.recipeService.create({
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
          imageIds: this.images.map((image) => image.id),
        });

    loading.dismiss();
    if (!response.success) return;

    this.markAsClean();

    this.navCtrl.navigateRoot(
      RouteMap.RecipePage.getPath(this.recipe.id || response.data.id)
    );
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

  async clipFromUrl() {
    const header = await this.translate
      .get("pages.editRecipe.clip.header")
      .toPromise();
    const subHeader = await this.translate
      .get("pages.editRecipe.clip.subHeader")
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

    const clipPrompt = await this.alertCtrl.create({
      header,
      subHeader,
      message,
      inputs: [
        {
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
      }
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

    const imageResponse = await this.imageService.createFromUrl(
      {
        url: response.data.imageURL,
      },
      {
        400: () => {},
        415: () => {},
        500: () => {},
      }
    );
    if (imageResponse.success) this.images.push(imageResponse.data);

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
}
