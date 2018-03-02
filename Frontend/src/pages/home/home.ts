import { Component } from '@angular/core';
import { Events, IonicPage, NavController, NavParams, LoadingController, AlertController, ToastController, PopoverController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';

@IonicPage({
  segment: 'list/:folder',
})
@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
  providers: [ LazyLoadImageDirective ]
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
  
  viewOptions: any;
  
  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public popoverCtrl: PopoverController,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public messagingService: MessagingServiceProvider) {
      
    this.folder = navParams.get('folder') || 'main';
    switch(this.folder) {
      case 'inbox':
        this.folderTitle = 'Inbox';
        break;
      default:
        this.folderTitle = 'My Recipes';
        break;
    }
    
    this.loadViewOptions();
    this.loadRecipes();
    
    this.searchText = '';
    this.showSearch = false;
  }
  
  loadViewOptions() {
    var defaults = {
      showLabels: true,
      showImages: true,
      showSource: false,
      sortByLabel: false,
    }
    
    this.viewOptions = {
      showLabels: JSON.parse(localStorage.getItem('showLabels')),
      showImages: JSON.parse(localStorage.getItem('showImages')),
      showSource: JSON.parse(localStorage.getItem('showSource')),
      sortByLabel: JSON.parse(localStorage.getItem('sortByLabel')),
    }
    
    for (var key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
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

      me.requestNotifications();
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
  
  requestNotifications() {
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'granted') {
      this.messagingService.enableNotifications();
      return;
    }

    let alert = this.alertCtrl.create({
      title: 'Notification Permissions',
      subTitle: 'To notify you when your contacts send you recipes, we need notification access.<br /><br />After dismissing this popup, you will be prompted to enable notification access.',
      buttons: [{
        text: 'Cancel',
        handler: () => {
          console.log('Disagree clicked');
        }
      },
      {
        text: 'Ok',
        handler: () => {
          this.messagingService.enableNotifications();
        }
      }]
    });
    alert.present();
  }
  
  openRecipe(recipe) {
    // me.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe._id
    });
  }
  
  presentPopover(event) {
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
