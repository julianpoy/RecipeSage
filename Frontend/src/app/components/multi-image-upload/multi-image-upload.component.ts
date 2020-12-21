import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToastController } from '@ionic/angular';
import loadImage from 'blueimp-load-image';

import { UserService } from '@/services/user.service';
import { ImageService } from '@/services/image.service';
import { LoadingService } from '@/services/loading.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { UtilService, RouteMap } from '@/services/util.service';

@Component({
  selector: 'multi-image-upload',
  templateUrl: 'multi-image-upload.component.html',
  styleUrls: ['./multi-image-upload.component.scss']
})
export class MultiImageUploadComponent {
  @Output() imageUpdate = new EventEmitter();

  _images;
  @Input()
  get images() {
    return this._images || [];
  }
  set images(val) {
    this._images = val;
  }

  constructor(
    private utilService: UtilService,
    private toastCtrl: ToastController,
    private userService: UserService,
    private imageService: ImageService,
    private loadingService: LoadingService,
    public capabilitiesService: CapabilitiesService,
  ) {}

  filePicker() {
    document.getElementById('filePicker').click();
  }

  async addImage(event) {
    const files = (event.srcElement || event.target).files;
    if (!files || !files[0]) {
      return;
    }

    if (this.images.length + files.length > 10) {
      const imageUploadTooManyToast = await this.toastCtrl.create({
        message: 'You can attach attach up to 10 images',
        buttons: [{
          text: 'Close',
          role: 'cancel'
        }]
      });
      imageUploadTooManyToast.present();
      return;
    }

    const loading = this.loadingService.start();

    const MAX_FILE_SIZE_MB = 8;

    try {
      await Promise.all(Array.from(files).map(async (file: any) => {
        const isOverMaxSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB; // Image is larger than MAX_FILE_SIZE_MB

        if (isOverMaxSize) {
          // Image is too large, do some resizing before high quality server conversion
          console.log(`Image is over ${MAX_FILE_SIZE_MB}MB. Converting locally`);
          file = await this.convertImage(file);
        }

        const image = await this.imageService.create(file);
        this.images.push(image);
      }));
    } catch (e) {
      const imageUploadErrorToast = await this.toastCtrl.create({
        message: 'There was an error processing one or more of the images that you selected',
        buttons: [{
          text: 'Close',
          role: 'cancel'
        }]
      });
      imageUploadErrorToast.present();
      console.error(e);
    }

    loading.dismiss();

    this.imageUpdate.emit(this.images);
  }

  convertImage(file) {
    const LOCAL_CONVERSION_WIDTH = 2048;
    const LOCAL_CONVERSION_HEIGHT = 2048;

    return new Promise((resolve, reject) => {
      const loadingImage = loadImage(
        file,
        (renderedCanvas, exif) => {
          renderedCanvas.toBlob(myBlob => {
            myBlob.name = file.name;
            resolve(myBlob);

            console.log('Local conversion complete');
          }, 'image/jpeg', 1);
        },
        {
          maxWidth: LOCAL_CONVERSION_WIDTH,
          maxHeight: LOCAL_CONVERSION_HEIGHT,
          crop: true,
          canvas: true,
          orientation: true
        }
      );

      loadingImage.onerror = err => {
        reject(err);
      };
    });
  }

  reorderImage(image, direction: number) {
    const imgIdx = this.images.indexOf(image);
    let newImgIdx = imgIdx + direction;
    if (newImgIdx < 0) newImgIdx = 0;
    if (newImgIdx > this.images.length - 1) newImgIdx = this.images.length - 1;

    this.images.splice(imgIdx, 1); // Remove
    this.images.splice(newImgIdx, 0, image); // Insert

    this.imageUpdate.emit(this.images);
  }

  removeImage(image) {
    const imgIdx = this.images.indexOf(image);
    this.images.splice(imgIdx, 1);

    this.imageUpdate.emit(this.images);
  }
}
