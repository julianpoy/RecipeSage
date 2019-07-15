import { Component } from '@angular/core';
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

  inputType: string = 'manualEntry';

  itemTitle: any = "";

  selectedRecipe: any;

  meal: any;

  constructor(
    public navCtrl: NavController,
    public modalCtrl: ModalController,
    public recipeService: RecipeService,
    public loadingService: LoadingService,
    public utilService: UtilService,
    public toastCtrl: ToastController) {

  }

  isFormValid() {
    if (this.inputType === 'recipe' && !this.selectedRecipe) {
      return false;
    }

    if (this.inputType === 'manualEntry' && (!this.itemTitle || this.itemTitle.length === 0)) {
      return false;
    }

    if (!this.meal) return false;

    return true;
  }

  save() {
    var item;
    if (this.inputType === 'recipe') {
      item = {
        title: this.selectedRecipe.title,
        recipeId: this.selectedRecipe.id
      };
    } else {
      item = {
        title: this.itemTitle
      }
    }

    item.meal = this.meal;

    this.modalCtrl.dismiss({
      item
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
