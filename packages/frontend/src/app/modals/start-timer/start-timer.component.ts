import {
  Component,
  Input,
  OnInit,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItemGroup,
  IonNote,
  IonInput,
  IonFooter,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { TimerService } from "../../services/timer.service";
import { closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "start-timer",
  templateUrl: "start-timer.component.html",
  styleUrls: ["start-timer.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonItem,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItemGroup,
    IonNote,
    IonInput,
    IonFooter,
  ],
})
export class StartTimerComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  private timerService = inject(TimerService);
  private translate = inject(TranslateService);

  @Input() durationSeconds = 0;
  @Input() step?: number;
  @Input() recipeTitle?: string;

  label = "";
  hours = 0;
  minutes = 0;
  seconds = 0;
  starting = false;

  constructor() {
    addIcons({ closeOutline });
  }

  async ngOnInit() {
    this.hours = Math.floor(this.durationSeconds / 3600);
    this.minutes = Math.floor((this.durationSeconds % 3600) / 60);
    this.seconds = this.durationSeconds % 60;

    if (this.step !== undefined && this.recipeTitle) {
      this.label = await this.translate
        .get("components.startTimer.stepLabel", {
          step: this.step,
          recipeTitle: this.recipeTitle,
        })
        .toPromise();
    } else {
      this.label = this.recipeTitle ?? "";
    }
  }

  get totalSeconds() {
    const hours = Math.max(0, Math.floor(Number(this.hours) || 0));
    const minutes = Math.max(0, Math.floor(Number(this.minutes) || 0));
    const seconds = Math.max(0, Math.floor(Number(this.seconds) || 0));
    return hours * 3600 + minutes * 60 + seconds;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async start() {
    if (this.totalSeconds <= 0 || this.starting) return;
    this.starting = true;

    const label =
      this.label.trim() ||
      (await this.translate
        .get("components.startTimer.defaultLabel")
        .toPromise());

    await this.modalCtrl.dismiss();
    await this.timerService.start({
      label,
      durationSeconds: this.totalSeconds,
      recipeTitle: this.recipeTitle,
    });
  }
}
