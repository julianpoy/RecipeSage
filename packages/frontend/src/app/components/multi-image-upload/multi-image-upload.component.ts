import { Component, Input, Output, EventEmitter } from "@angular/core";
import { ToastController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { Image, ImageService } from "~/services/image.service";
import { LoadingService } from "~/services/loading.service";
import { CapabilitiesService } from "~/services/capabilities.service";

@Component({
  selector: "multi-image-upload",
  templateUrl: "multi-image-upload.component.html",
  styleUrls: ["./multi-image-upload.component.scss"],
})
export class MultiImageUploadComponent {
  @Output() imageUpdate = new EventEmitter();

  _images: Image[] = [];
  @Input()
  get images() {
    return this._images;
  }
  set images(val: Image[]) {
    this._images = val;
  }

  constructor(
    private toastCtrl: ToastController,
    private imageService: ImageService,
    private loadingService: LoadingService,
    private translate: TranslateService,
    public capabilitiesService: CapabilitiesService,
  ) {}

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

    const MAX_FILE_SIZE_MB = 30;

    let someUploadFailed = false;
    for (const file of files) {
      const isOverMaxSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB; // Image is larger than MAX_FILE_SIZE_MB

      if (isOverMaxSize) {
        someUploadFailed = true;
        continue;
      }

      const response = await this.imageService.create(file, {
        "*": () => (someUploadFailed = true),
      });
      if (response.success) this.images.push(response.data);
    }

    if (someUploadFailed) {
      const message = await this.translate
        .get("components.multiImageUpload.imageError")
        .toPromise();
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

  reorderImage(image: Image, direction: number) {
    const imgIdx = this.images.indexOf(image);
    let newImgIdx = imgIdx + direction;
    if (newImgIdx < 0) newImgIdx = 0;
    if (newImgIdx > this.images.length - 1) newImgIdx = this.images.length - 1;

    this.images.splice(imgIdx, 1); // Remove
    this.images.splice(newImgIdx, 0, image); // Insert

    this.imageUpdate.emit(this.images);
  }

  removeImage(image: Image) {
    const imgIdx = this.images.indexOf(image);
    this.images.splice(imgIdx, 1);

    this.imageUpdate.emit(this.images);
  }
}
