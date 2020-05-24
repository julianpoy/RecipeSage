import { Input, Component } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';
import { RecipeService } from '@/services/recipe.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-new-meal-plan-item-modal',
  templateUrl: 'new-meal-plan-item-modal.page.html',
  styleUrls: ['new-meal-plan-item-modal.page.scss']
})
export class NewMealPlanItemModalPage {

  todayYear = new Date().getFullYear();

  @Input() isEditing = false;
  @Input() inputType = 'recipe';
  @Input() recipe;
  @Input() title: any = '';
  @Input() meal: any;
  @Input() scheduled = new Date();

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController) {
  }

  isFormValid() {
    if (this.inputType === 'recipe' && !this.recipe) return false;

    if (this.inputType === 'manualEntry' && (!this.title || this.title.length === 0)) return false;

    if (!this.meal) return false;

    return true;
  }

  save() {
    let item;
    if (this.inputType === 'recipe') {
      item = {
        title: this.recipe.title,
        recipeId: this.recipe.id
      };
    } else {
      item = {
        title: this.title
      };
    }

    item.meal = this.meal;
    item.scheduled = this.scheduled;

    this.modalCtrl.dismiss({
      item
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
