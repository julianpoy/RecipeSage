import { MealPlanService } from "~/services/meal-plan.service";
import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";

@Component({
  standalone: true,
  selector: "page-ical-meal-plan-modal",
  templateUrl: "ical-meal-plan-modal.page.html",
  styleUrls: ["ical-meal-plan-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, CopyWithWebshareComponent],
})
export class ICalMealPlanModalPage {
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
