import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Input,
  ViewChild,
  inject,
} from "@angular/core";
import { IonicSlides, ModalController } from "@ionic/angular";
import { SwiperContainer } from "swiper/element";
import { Swiper } from "swiper/types";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "image-viewer",
  templateUrl: "image-viewer.component.html",
  styleUrls: ["./image-viewer.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ImageViewerComponent {
  private modalCtrl = inject(ModalController);

  @Input({
    required: true,
  })
  imageUrls!: string[];

  @ViewChild("swiperContainer", { static: true }) swiperContainer?: ElementRef;

  slideNum = 0;

  swiperModules = [IonicSlides];

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
