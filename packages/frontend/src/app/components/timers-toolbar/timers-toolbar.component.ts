import {
  Component,
  DoCheck,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { AlertController, IonButton, IonIcon } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { KitchenTimer, TimerService } from "../../services/timer.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { closeOutline, timerOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

const TICK_INTERVAL_MS = 1000;

@Component({
  standalone: true,
  selector: "timers-toolbar",
  templateUrl: "timers-toolbar.component.html",
  styleUrls: ["./timers-toolbar.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonButton, IonIcon],
})
export class TimersToolbarComponent implements DoCheck, OnDestroy {
  private alertCtrl = inject(AlertController);
  private translate = inject(TranslateService);
  private ngZone = inject(NgZone);
  private changeDetectorRef = inject(ChangeDetectorRef);
  timerService = inject(TimerService);

  now = Date.now();
  private tickInterval?: ReturnType<typeof setInterval>;

  constructor() {
    addIcons({ closeOutline, timerOutline });
  }

  ngDoCheck() {
    if (this.tickInterval || !this.hasRunningTimer()) return;

    this.now = Date.now();
    this.ngZone.runOutsideAngular(() => {
      this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL_MS);
    });
  }

  ngOnDestroy() {
    this.stopTicking();
  }

  private tick() {
    this.now = Date.now();
    this.changeDetectorRef.detectChanges();
    if (!this.hasRunningTimer()) this.stopTicking();
  }

  private stopTicking() {
    clearInterval(this.tickInterval);
    this.tickInterval = undefined;
  }

  private hasRunningTimer() {
    return this.timerService.timers.some((timer) => !this.isFinished(timer));
  }

  isFinished(timer: KitchenTimer) {
    return this.timerService.getRemainingSeconds(timer, this.now) === 0;
  }

  formatRemaining(timer: KitchenTimer) {
    const remaining = this.timerService.getRemainingSeconds(timer, this.now);
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    const paddedSeconds = String(seconds).padStart(2, "0");
    if (!hours) return `${minutes}:${paddedSeconds}`;

    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${hours}:${paddedMinutes}:${paddedSeconds}`;
  }

  async removeTimer(timer: KitchenTimer) {
    if (this.isFinished(timer)) {
      await this.timerService.remove(timer);
      return;
    }

    const [header, cancel, stop] = await Promise.all([
      this.translate.get("components.timersToolbar.stopHeader").toPromise(),
      this.translate.get("generic.cancel").toPromise(),
      this.translate.get("components.timersToolbar.stop").toPromise(),
    ]);

    const alert = await this.alertCtrl.create({
      header,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: stop,
          handler: () => {
            void this.timerService.remove(timer);
          },
        },
      ],
    });
    await alert.present();
  }
}
