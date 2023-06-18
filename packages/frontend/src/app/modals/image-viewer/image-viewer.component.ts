import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "image-viewer",
  templateUrl: "image-viewer.component.html",
  styleUrls: ["./image-viewer.component.scss"],
})
export class ImageViewerComponent {
  @Input({
    required: true,
  })
  imageUrls!: string[];

  @ViewChild("slider", { static: true }) slider?: any;

  slideNum = 0;

  constructor(private modalCtrl: ModalController) {}

  ionViewWillEnter() {
    this.slider?.update();
  }

  async slideDidChange() {
    const slideNum = await this.slider?.getActiveIndex();
    this.slideNum = slideNum;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
