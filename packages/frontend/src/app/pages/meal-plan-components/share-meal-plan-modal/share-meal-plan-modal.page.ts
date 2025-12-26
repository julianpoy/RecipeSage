import { MealPlanService } from "~/services/meal-plan.service";
import { Component, Input, inject } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";

@Component({
  standalone: true,
  selector: "page-share-meal-plan-modal",
  templateUrl: "share-meal-plan-modal.page.html",
  styleUrls: ["share-meal-plan-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, CopyWithWebshareComponent],
})
export class ShareMealPlanModalPage {
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
