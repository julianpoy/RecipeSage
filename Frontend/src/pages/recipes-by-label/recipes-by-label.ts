import { Component } from '@angular/core';
import { IonicPage, NavController, LoadingController, ToastController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';
import { LabelServiceProvider, Label } from '../../providers/label-service/label-service';

@IonicPage()
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
    public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider) {
    this.loadRecipes();
    
    this.searchText = '';
    this.showSearch = false;
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad RecipesByLabelPage');
  }
  
  loadRecipes() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...',
      dismissOnPageChange: true
    });
  
    loading.present();
    
    this.labelService.fetch(true).subscribe(function(response) {
      loading.dismiss();

      me.labels = response;      
    }, function(err) {
      loading.dismiss();

      switch(err.status) {
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
  
  openRecipe(recipe) {
    // me.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe._id
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
