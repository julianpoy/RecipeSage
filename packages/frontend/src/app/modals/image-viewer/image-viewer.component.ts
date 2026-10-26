import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  GestureController,
  IonicSlides,
  ModalController,
  type Gesture,
} from "@ionic/angular";
import { Swiper } from "swiper/types";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonIcon, IonContent } from "@ionic/angular";
import { chevronBack, chevronForward, close } from "ionicons/icons";
import { addIcons } from "ionicons";

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.4;
const DRAG_PROGRESS_DISTANCE = 400;

@Component({
  standalone: true,
  selector: "image-viewer",
  templateUrl: "image-viewer.component.html",
  styleUrls: ["./image-viewer.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonIcon, IonContent],
  changeDetection: ChangeDetectionStrategy.Eager,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ImageViewerComponent implements AfterViewInit, OnDestroy {
  constructor() {
    addIcons({ chevronBack, chevronForward, close });
  }

  private modalCtrl = inject(ModalController);
  private gestureCtrl = inject(GestureController);
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input({
    required: true,
  })
  imageUrls!: string[];

  @ViewChild("swiperContainer", { static: true }) swiperContainer?: ElementRef;
  @ViewChild("viewer", { static: true }) viewer?: ElementRef<HTMLElement>;

  slideNum = signal(0);

  swiperModules = [IonicSlides];

  private dismissGesture?: Gesture;

  ionViewWillEnter() {
    const swiper = this.getSwiperInstance();
    if (!swiper) return;

    swiper.update();
    swiper.on("slideChange", () => {
      this.slideDidChange();
    });
  }

  ngAfterViewInit() {
    const viewer = this.viewer?.nativeElement;
    if (!viewer) return;

    this.dismissGesture = this.gestureCtrl.create({
      el: viewer,
      gestureName: "image-viewer-dismiss",
      direction: "y",
      threshold: 10,
      canStart: () => (this.getSwiperInstance()?.zoom.scale ?? 1) <= 1,
      onMove: ({ deltaY }) => this.setDragOffset(deltaY, false),
      onEnd: ({ deltaY, velocityY }) => {
        if (deltaY > DISMISS_DISTANCE || velocityY > DISMISS_VELOCITY) {
          this.dismiss();
          return;
        }
        this.setDragOffset(0, true);
      },
    });
    this.dismissGesture.enable();
  }

  ngOnDestroy() {
    this.dismissGesture?.destroy();
  }

  private setDragOffset(deltaY: number, animate: boolean) {
    const viewer = this.viewer?.nativeElement;
    if (!viewer) return;

    const offset = deltaY > 0 ? deltaY : deltaY / 4;
    viewer.style.transform = offset ? `translateY(${offset}px)` : "";

    const host = this.elementRef.nativeElement;
    host.classList.toggle("settling", animate);
    host.style.setProperty(
      "--drag-progress",
      String(Math.min(Math.abs(offset) / DRAG_PROGRESS_DISTANCE, 1)),
    );
  }

  getSwiperInstance(): Swiper | undefined {
    return this.swiperContainer?.nativeElement.swiper;
  }

  slidePrev() {
    this.getSwiperInstance()?.slidePrev();
  }

  slideNext() {
    this.getSwiperInstance()?.slideNext();
  }

  async slideDidChange() {
    const swiper = this.getSwiperInstance();

    const slideNum = swiper?.activeIndex;
    if (typeof slideNum !== "number") return;

    this.slideNum.set(slideNum);
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
