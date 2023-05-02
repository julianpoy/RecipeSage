import {MealPlanService} from '~/services/meal-plan.service';
import {UtilService} from '~/services/util.service';
import { Component, Input } from '@angular/core';
import {ModalController} from '@ionic/angular';

@Component({
  selector: 'page-share-meal-plan-modal',
  templateUrl: 'share-meal-plan-modal.page.html',
  styleUrls: ['share-meal-plan-modal.page.scss']
})
export class ShareMealPlanModalPage {
  @Input() mealPlanId: string;

  icalURL = '';

  constructor(
    private modalCtrl: ModalController,
    private utilService: UtilService,
    private mealPlanService: MealPlanService,
  ) {}

  ionViewWillEnter() {
    this.icalURL = this.mealPlanService.getICalUrl(this.mealPlanId);
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
