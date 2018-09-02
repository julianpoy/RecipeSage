import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';
import { RecipeServiceProvider } from '../../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-meal-plan-item-modal',
  templateUrl: 'new-meal-plan-item-modal.html',
})
export class NewMealPlanItemModalPage {

  inputType: string = 'manualEntry';

  itemTitle: any = "";

  selectedRecipe: any;

  meal: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public recipeService: RecipeServiceProvider,
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public toastCtrl: ToastController,
    public navParams: NavParams) {

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
        recipe: this.selectedRecipe._id
      };
    } else {
      item = {
        title: this.itemTitle
      }
    }

    item.meal = this.meal;

    this.viewCtrl.dismiss({
      destination: false,
      item: item
    });
  }

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
