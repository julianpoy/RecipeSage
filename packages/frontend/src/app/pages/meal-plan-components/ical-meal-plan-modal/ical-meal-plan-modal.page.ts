import { MealPlanService } from "../../../services/meal-plan.service";
import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonIcon,
  IonLabel,
} from "@ionic/angular/standalone";
import { close } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-ical-meal-plan-modal",
  templateUrl: "ical-meal-plan-modal.page.html",
  styleUrls: ["ical-meal-plan-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    CopyWithWebshareComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonLabel,
  ],
})
export class ICalMealPlanModalPage {
  constructor() {
    addIcons({ close });
  }

  private modalCtrl = inject(ModalController);
  private mealPlanService = inject(MealPlanService);

  @Input({
    required: true,
  })
  mealPlanId!: string;

  icalURL = "";

  ionViewWillEnter() {
    this.icalURL = this.mealPlanService.getICalUrl(this.mealPlanId);
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
