import { Component, ViewChild, ChangeDetectorRef  } from '@angular/core';
import { Observable, Subject } from 'rxjs'
import { Events, IonicPage, NavController, NavParams, LoadingController, AlertController, ToastController, PopoverController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';

@IonicPage({
  segment: 'list/:folder',
  priority: 'high',
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
  
  viewOptions: any = {};
  filterOptions: any = {};
  
  searchWorker: any;
  
  searchResultContainer: any;
  searchResultsAfterFilterLen: number = -1;
  
  //Lazy load reqs
  @ViewChild('container') container: any;
  updateSearchResult$: any;
  scrollAndSearch$: any;
  
  constructor(
    private cdRef:ChangeDetectorRef,
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public popoverCtrl: PopoverController,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public userService: UserServiceProvider,
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
    this.filterOptions.viewOptions = this.viewOptions;
    var me = this;
    this.filterOptions.onchange = function() {
      try {
        me.updateSearchResult$.next();
      } catch(e){}
    }

    // var me = this;
    // events.subscribe('recipe:generalUpdate', () => {
    //   me.loadRecipes();
    // });
    
    events.subscribe('messages:new', (message) => {
      if (message.recipe && this.folder === 'inbox') {
        this.loadRecipes();
      }
    });
    
    events.subscribe('import:pepperplate:complete', () => {
      this.loadRecipes();
    });
    
    this.searchText = '';
    this.showSearch = false;
  }
  
  ionViewDidLoad() {
    this.searchResultContainer = document.getElementById('recipeListContainer');
  }
  
  ionViewWillEnter() {
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...',
      dismissOnPageChange: true
    });
  
    loading.present();
    
    this.loadRecipes().then(function() {
      loading.dismiss();
    }, function() {
      loading.dismiss();
    });
  }
  
  ngAfterViewInit() {
    this.updateSearchResult$ = new Subject();
    this.scrollAndSearch$ = Observable.merge(
      this.container.ionScroll,
      this.updateSearchResult$
    );
  }
  
  ngAfterViewChecked() {
    if (this.searchResultContainer) {
      var len = this.searchResultContainer.children.length;
      if (len !== this.searchResultsAfterFilterLen) {
        this.searchResultsAfterFilterLen = len;
        this.cdRef.detectChanges();
      }
    } else {
      this.searchResultsAfterFilterLen = -1;
    }
  }
  
  refresh(refresher) {
    this.loadRecipes().then(function() {
      refresher.complete();
    }, function() {
      refresher.complete();
    });
  }
  
  loadViewOptions() {
    var defaults = {
      showLabels: true,
      showImages: true,
      showSource: false,
      sortBy: '-title',
      selectedLabels: [],
    }

    this.viewOptions.showLabels = JSON.parse(localStorage.getItem('showLabels'));
    this.viewOptions.showImages = JSON.parse(localStorage.getItem('showImages'));
    this.viewOptions.showSource = JSON.parse(localStorage.getItem('showSource'));
    this.viewOptions.sortBy = localStorage.getItem('sortBy');
    this.viewOptions.selectedLabels = [];
    
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
    
    return new Promise(function(resolve, reject) {
      me.recipeService.fetch({
        folder: me.folder,
        sortBy: me.viewOptions.sortBy,
        // labels: me.viewOptions.selectedLabels
      }).subscribe(function(response) {
        me.recipes = response;
        
        if (me.searchWorker) me.searchWorker.terminate();
        me.searchWorker = new Worker('assets/src/search-worker.js?rev=1.0.0b8');
        
        me.searchWorker.postMessage(JSON.stringify({
          op: 'init',
          data: me.recipes
        }));
        
        me.searchWorker.onmessage = function(e) {
          var message = JSON.parse(e.data);
          if (message.op === 'results') {
            me.recipes = message.data;
          }
          // After render loop
          setTimeout(function() {
            me.updateSearchResult$.next();
          });
        }
        
        if (me.searchText) {
          me.search(me.searchText);
        }
        
        resolve();
        
        me.requestNotifications();
      }, function(err) {
        reject();
        
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
    });
  }
  
  requestNotifications() {
    if (!('Notification' in window) || (<any>Notification).permission === 'denied') return;

    if ((<any>Notification).permission === 'granted') {
      this.messagingService.enableNotifications();
      return;
    }
    
    
    if (!localStorage.getItem('notificationExplainationShown')) {
      localStorage.setItem('notificationExplainationShown', 'true');
      var me = this;
  
      let alert = this.alertCtrl.create({
        title: 'Notification Permissions',
        subTitle: 'To notify you when your contacts send you recipes, we need notification access.<br /><br /><b>After dismissing this popup, you will be prompted to enable notification access.</b>',
        buttons: [{
          text: 'Continue',
          handler: () => {
            try {
              me.messagingService.enableNotifications();
            } catch(e) {
              let error = this.alertCtrl.create({
                title: 'Could not enable notifications',
                subTitle: 'Please enable notifications for this site manually within your browser settings if you wish to receive inbox notifications.',
                buttons: [{
                  text: 'Ok',
                  handler: () => {}
                }]
              });
              error.present();
            }
          }
        }]
      });
      alert.present();
    } else {
      try {
        this.messagingService.enableNotifications();
      } catch(e) {}
    }
  }
  
  openRecipe(recipe) {
    // me.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe._id
    });
  }
  
  editRecipe(recipe) {
    this.navCtrl.push('EditRecipePage', {
      recipe: recipe
    });
  }
  
  moveRecipe(recipe, folderName) {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Loading...'
    });
  
    loading.present();
    
    recipe.folder = folderName;
    
    this.recipeService.update(recipe).subscribe(function(response) {
      loading.dismiss();
      
      me.loadRecipes().then(function() {}, function() {});
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }
  
  deleteRecipe(recipe) {
    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
      message: 'This will permanently delete the recipe from your account. This action is irreversible.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {}
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteRecipe(recipe);
          }
        }
      ]
    });
    alert.present();
  }
  
  private _deleteRecipe(recipe) {
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Deleting recipe...'
    });
  
    loading.present();
    
    this.recipeService.remove(recipe).subscribe(function(response) {
      loading.dismiss();
      
      me.loadRecipes();
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
            duration: 6000
          }).present();
          break;
        case 404:
          me.toastCtrl.create({
            message: 'Can\'t find the recipe you\'re trying to delete.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
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
  
  search(text) {
    if (!text) text = '';
    this.searchText = text;
    this.searchWorker.postMessage(JSON.stringify({
      op: 'search',
      data: text
    }));
  }
  
  trackByFn(index, item) {
    return item._id;
  }
  
  nextViewType() {
    var viewTypeIdx = this.viewTypes.indexOf(this.viewType);
    
    viewTypeIdx++;

    if (viewTypeIdx === this.viewTypes.length) viewTypeIdx = 0;
    
    this.viewType = this.viewTypes[viewTypeIdx];
    
    localStorage.setItem('viewType', this.viewType);
  }
}
