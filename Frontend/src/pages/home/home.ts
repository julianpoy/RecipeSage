import { Component } from '@angular/core';
import { NavController, LoadingController, ToastController } from 'ionic-angular';

import { LoginPage } from '../login/login';
import { RecipePage } from '../recipe/recipe';
import { EditRecipePage } from '../edit-recipe/edit-recipe';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [ RecipeServiceProvider ]
})
export class HomePage {
  
  recipes: Recipe[];

  showSearch: boolean;
  searchText: string;

  constructor(
    public navCtrl: NavController,
    public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider) {
    this.loadRecipes();
    
    this.searchText = '';
    this.showSearch = false;
    
    localStorage.setItem('base', 'http://devbox.julianjp.com:3000/');
  }
  
  loadRecipes() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...'
    });
  
    loading.present();
    
    this.recipeService.fetch().subscribe(function(response) {
      loading.dismiss();

      me.recipes = response;      
    }, function(err) {
      loading.dismiss();

      switch(err.status) {
        case 401:
          me.navCtrl.setRoot(LoginPage, {}, {animate: true, direction: 'forward'});
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
    this.navCtrl.push(RecipePage, {
      recipe: recipe
    });
  }
  
  newRecipe() {
    this.navCtrl.push(EditRecipePage);
  }
  
  toggleSearch() {
    this.showSearch = !this.showSearch;
  }
}
