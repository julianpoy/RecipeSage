import {UtilService} from '@/services/util.service';
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
  ) {}

  ionViewWillEnter() {
    this.icalURL = `${this.utilService.getBase()}${this.mealPlanId}/ical`;
  }

  close() {
    this.modalCtrl.dismiss();
  }
}
