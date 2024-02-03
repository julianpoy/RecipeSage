import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import { IonicSlides, ModalController } from "@ionic/angular";
import { SwiperContainer } from "swiper/element";
import { Swiper } from "swiper/types";

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

  @ViewChild("swiperContainer", { static: true }) swiperContainer?: ElementRef;

  slideNum = 0;

  swiperModules = [IonicSlides];

  constructor(private modalCtrl: ModalController) {}

  ionViewWillEnter() {
    const swiper = this.getSwiperInstance();

    swiper.update();
    swiper.on("slideChange", () => {
      this.slideDidChange();
    });
  }

  getSwiperInstance(): Swiper {
    return this.swiperContainer?.nativeElement.swiper;
  }

  async slideDidChange() {
    const swiper = this.getSwiperInstance();

    const slideNum = swiper?.activeIndex;
    if (typeof slideNum !== "number") return;

    this.slideNum = slideNum;
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
