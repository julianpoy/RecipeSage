import { Component } from '@angular/core';
import { IonicPage, NavController, ToastController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';
import { LabelServiceProvider, Label } from '../../providers/label-service/label-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-recipes-by-label',
  templateUrl: 'recipes-by-label.html',
  providers: [ LazyLoadImageDirective, RecipeServiceProvider, LabelServiceProvider ]
})
export class RecipesByLabelPage {

  labels: Label[];

  showSearch: boolean;
  searchText: string;

  imageLoadOffset: number = 20;

  constructor(public navCtrl: NavController,
    public loadingService: LoadingServiceProvider,
    public toastCtrl: ToastController,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider) {
    this.loadRecipes();

    this.searchText = '';
    this.showSearch = false;
  }

  ionViewDidLoad() {}

  loadRecipes() {
    var loading = this.loadingService.start();

    this.labelService.fetch(true).subscribe(response => {
      loading.dismiss();

      this.labels = response;
    }, err => {
      loading.dismiss();

      switch(err.status) {
        case 0:
          let offlineToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  openRecipe(recipe) {
    // this.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe.id
    });
  }

  newRecipe() {
    this.navCtrl.push('EditRecipePage');
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  toggleLabel(label) {
    if (!label.expand) label.expand = true;
    else label.expand = false;
  }
}
