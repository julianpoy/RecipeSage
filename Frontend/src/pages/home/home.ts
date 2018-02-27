import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController, ToastController, PopoverController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

@IonicPage({
  segment: 'list/:folder',
})
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [ LazyLoadImageDirective, RecipeServiceProvider ]
})
export class HomePage {
  
  recipes: Recipe[];

  showSearch: boolean;
  searchText: string;
  
  imageLoadOffset: number = 20;
  
  viewType: string = localStorage.getItem('viewType') || 'list';
  
  viewTypes: string[] = ['list', 'cards'];
  
  folder: string;
  folderTitle: string;
  
  viewOptions: any = {
    showLabels: JSON.parse(localStorage.getItem('showLabels') || true),
    showImages: JSON.parse(localStorage.getItem('showImages') || true),
    showSource: JSON.parse(localStorage.getItem('showSource') || false),
    sortByLabel: JSON.parse(localStorage.getItem('sortByLabel') || false)
  };
  
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public popoverCtrl: PopoverController,
    public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider) {
      
    this.folder = navParams.get('folder') || 'main';
    switch(this.folder) {
      case 'inbox':
        this.folderTitle = 'Inbox';
        break;
      default:
        this.folderTitle = 'My Recipes';
        break;
    }

    this.loadRecipes();
    
    this.searchText = '';
    this.showSearch = false;
  }

  loadRecipes() {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...'
    });
  
    loading.present();
    
    this.recipeService.fetch(this.folder).subscribe(function(response) {
      loading.dismiss();

      me.recipes = response;      
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
  
  presentPopover(event) {
    console.log(this.viewOptions)
    let popover = this.popoverCtrl.create('HomePopoverPage', { viewOptions: this.viewOptions });

    popover.present({
      ev: event
    });
  }
  
  newRecipe() {
    this.navCtrl.push('EditRecipePage');
  }
  
  toggleSearch() {
    this.showSearch = !this.showSearch;
  }
  
  nextViewType() {
    var viewTypeIdx = this.viewTypes.indexOf(this.viewType);
    
    viewTypeIdx++;

    if (viewTypeIdx === this.viewTypes.length) viewTypeIdx = 0;
    
    this.viewType = this.viewTypes[viewTypeIdx];
    
    localStorage.setItem('viewType', this.viewType);
  }
}
