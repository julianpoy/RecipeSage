import { Component, ViewChild } from '@angular/core';
import { Observable, Subject } from 'rxjs'
import { Events, IonicPage, NavController, NavParams, LoadingController, AlertController, ToastController, PopoverController } from 'ionic-angular';

import { LazyLoadImageDirective } from 'ng-lazyload-image';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';

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
  
  viewOptions: any = {};
  filterOptions: any = {};
  
  searchWorker: any;
  
  
  //Lazy load reqs
  @ViewChild('container') container: any;
  updateSearchResult$: any;
  scrollAndSearch$: any;
  
  constructor(
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
    
    events.subscribe('recipe:inbox:new', (recipe) => {
      if (this.folder === 'inbox') {
        this.loadRecipes();
      }
    });
    
    this.searchText = '';
    this.showSearch = false;
    
    this.userService.checkForUpdate({
      version: (<any>window).version
    }).subscribe(function(response) {
      if (response.updateAvailable) {
        (<any>window).location.reload(true);
      }
    }, function() {});
  }
  
  ionViewWillEnter() {
    let loading = this.loadingCtrl.create({
      content: 'Loading recipes...'
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
