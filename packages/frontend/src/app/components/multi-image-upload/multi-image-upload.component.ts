import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { AlertController, ToastController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { ImageService } from "../../services/image.service";
import { LoadingService } from "../../services/loading.service";
import { CapabilitiesService } from "../../services/capabilities.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import type { ImageSummary } from "@recipesage/prisma";
import { IonIcon } from "@ionic/angular/standalone";
import {
  caretBack,
  caretForward,
  informationCircleOutline,
  removeCircleOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "multi-image-upload",
  templateUrl: "multi-image-upload.component.html",
  styleUrls: ["./multi-image-upload.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonIcon],
})
export class MultiImageUploadComponent {
  constructor() {
    addIcons({
      caretBack,
      caretForward,
      informationCircleOutline,
      removeCircleOutline,
    });
  }

  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private imageService = inject(ImageService);
  private loadingService = inject(LoadingService);
  private translate = inject(TranslateService);
  capabilitiesService = inject(CapabilitiesService);

  @Output() imageUpdate = new EventEmitter<ImageSummary[]>();

  _images: ImageSummary[] = [];
  @Input()
  get images() {
    return this._images;
  }
  set images(val: ImageSummary[]) {
    this._images = val;
  }

  filePicker() {
    document.getElementById("filePicker")?.click();
  }

  async addImage(event: any) {
    const files = (event.srcElement || event.target).files;
    if (!files || !files[0]) {
      return;
    }

    if (this.images.length + files.length > 10) {
      const message = await this.translate
        .get("components.multiImageUpload.imageLimit")
        .toPromise();
      const close = await this.translate.get("generic.close").toPromise();

      const imageUploadTooManyToast = await this.toastCtrl.create({
        message,
        buttons: [
          {
            text: close,
            role: "cancel",
          },
        ],
      });
      imageUploadTooManyToast.present();
      return;
    }

    const loading = this.loadingService.start();

    const MAX_FILE_SIZE_MB = 39;

    let someUploadFailed = false;
    let someUploadHadUnsupportedFormat = false;
    for (const file of files) {
      const isOverMaxSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB; // Image is larger than MAX_FILE_SIZE_MB

      if (isOverMaxSize) {
        someUploadFailed = true;
        continue;
      }

      const response = await this.imageService.create(file, {
        415: () => {
          someUploadFailed = true;
          someUploadHadUnsupportedFormat = true;
        },
        "*": () => (someUploadFailed = true),
      });
      if (response.success) this.images.push(response.data);
    }

    if (someUploadFailed) {
      const messageKey = someUploadHadUnsupportedFormat
        ? "components.multiImageUpload.imageFormatError"
        : "components.multiImageUpload.imageError";
      const message = await this.translate.get(messageKey).toPromise();
      const close = await this.translate.get("generic.close").toPromise();

      const imageUploadErrorToast = await this.toastCtrl.create({
        message,
        buttons: [
          {
            text: close,
            role: "cancel",
          },
        ],
      });
      imageUploadErrorToast.present();
    }

    loading.dismiss();

    this.imageUpdate.emit(this.images);
  }

  reorderImage(image: ImageSummary, direction: number) {
    const imgIdx = this.images.indexOf(image);
    let newImgIdx = imgIdx + direction;
    if (newImgIdx < 0) newImgIdx = 0;
    if (newImgIdx > this.images.length - 1) newImgIdx = this.images.length - 1;

    this.images.splice(imgIdx, 1); // Remove
    this.images.splice(newImgIdx, 0, image); // Insert

    this.imageUpdate.emit(this.images);
  }

  async showContributorHint() {
    const header = await this.translate
      .get("components.multiImageUpload.contributorHint.header")
      .toPromise();
    const message = await this.translate
      .get("components.multiImageUpload.contributorHint.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      cssClass: "alert-preline",
      buttons: [{ text: okay }],
    });
    alert.present();
  }

  removeImage(image: ImageSummary) {
    const imgIdx = this.images.indexOf(image);
    this.images.splice(imgIdx, 1);

    this.imageUpdate.emit(this.images);
  }
}
