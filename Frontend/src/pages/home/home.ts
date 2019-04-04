import { Component } from '@angular/core';
import { Events, IonicPage, NavController, NavParams, AlertController, ToastController, PopoverController } from 'ionic-angular';

import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { WebsocketServiceProvider } from '../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

import { LabelServiceProvider, Label } from '../../providers/label-service/label-service';

@IonicPage({
  segment: 'list/:folder',
  priority: 'high',
})
@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {

  labels: Label[] = [];

  recipes: Recipe[] = [];
  recipeFetchBuffer: number = 15;
  fetchPerPage: number = 50;
  lastRecipeCount: number;
  totalRecipeCount: number;

  loading: boolean = true;
  selectedRecipeIds: string[] = [];

  searchText: string = '';

  folder: string;
  folderTitle: string;

  viewOptions: any = {};
  reloadPending: boolean = true;

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingServiceProvider,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public recipeService: RecipeServiceProvider,
    public labelService: LabelServiceProvider,
    public userService: UserServiceProvider,
    public utilService: UtilServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public messagingService: MessagingServiceProvider) {

    this.folder = navParams.get('folder') || 'main';
    switch(this.folder) {
      case 'inbox':
        this.folderTitle = 'Recipe Inbox';
        break;
      default:
        this.folderTitle = 'My Recipes';
        break;
    }

    this.loadViewOptions();

    events.subscribe('recipe:created', () => this.reloadPending = true);
    events.subscribe('recipe:modified', () => this.reloadPending = true);
    events.subscribe('recipe:deleted', () => this.reloadPending = true);
    events.subscribe('label:created', () => this.reloadPending = true);
    events.subscribe('label:deleted', () => this.reloadPending = true);
    events.subscribe('import:pepperplate:complete', () => {
      let loading = this.loadingService.start();
      this.resetAndLoadAll().then(() => {
        loading.dismiss();
      }, () => {
        loading.dismiss();
      })
    });

    this.websocketService.register('messages:new', payload => {
      if (payload.recipe && this.folder === 'inbox') {
        this.resetAndLoadRecipes();
      }
    }, this);
  }

  ionViewWillEnter() {
    this.clearSelectedRecipes();

    if (this.reloadPending) {
      let loading = this.loadingService.start();
      this.resetAndLoadAll().then(() => {
        loading.dismiss();
      }, () => {
        loading.dismiss();
      });
    }
  }

  refresh(refresher) {
    this.resetAndLoadAll().then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  loadViewOptions() {
    var defaults = {
      showLabels: true,
      showLabelChips: false,
      showImages: true,
      showSource: false,
      sortBy: '-title',
      selectedLabels: [],
    }

    this.viewOptions.showLabels = JSON.parse(localStorage.getItem('showLabels'));
    this.viewOptions.showLabelChips = JSON.parse(localStorage.getItem('showLabelChips'));
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

  fetchMoreRecipes(event) {
    if (this.searchText) return;

    let shouldFetchMore = this.lastRecipeCount < event.endIndex + this.recipeFetchBuffer;

    let moreToScroll = this.lastRecipeCount <= this.totalRecipeCount;
    if (shouldFetchMore && moreToScroll) {
      this.loadRecipes(this.lastRecipeCount, this.fetchPerPage)
    }
  }

  resetAndLoadAll(): Promise<any> {
    this.reloadPending = false;

    if (this.viewOptions.selectedLabels.length === 0) {
      return Promise.all([
        this.resetAndLoadLabels(),
        this.resetAndLoadRecipes()
      ])
    }

    return this.resetAndLoadLabels().then(() => {
      var labelNames = this.labels.map(e => e.title);

      let selectedLabels = this.viewOptions.selectedLabels;
      selectedLabels.splice(0, selectedLabels.length, ...selectedLabels.filter(e => labelNames.indexOf(e) > -1));

      return this.resetAndLoadRecipes();
    })
  }

  resetAndLoadLabels() {
    this.labels = [];
    return this.loadLabels();
  }

  resetAndLoadRecipes() {
    this.loading = true;
    this.resetRecipes();

    return this._resetAndLoadRecipes().then(() => {
      this.loading = false;
    }, () => {
      this.loading = false;
    })
  }

  _resetAndLoadRecipes() {
    if (this.searchText) {
      return this.search(this.searchText);
    }
    return this.loadRecipes(0, this.fetchPerPage);
  }

  resetRecipes() {
    this.recipes = [];
    this.lastRecipeCount = 0;
  }

  loadRecipes(offset, numToFetch) {
    this.lastRecipeCount += numToFetch;

    return new Promise((resolve, reject) => {
      this.recipeService.fetch({
        folder: this.folder,
        sortBy: this.viewOptions.sortBy,
        offset,
        count: numToFetch,
        ...(this.viewOptions.selectedLabels.length > 0 ? { labels: this.viewOptions.selectedLabels } : {})
      }).subscribe(response => {

        this.totalRecipeCount = response.totalCount;

        this.recipes = this.recipes.concat(response.data);

        resolve();
      }, err => {
        reject();

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
    });
  }

  loadLabels() {
    return new Promise((resolve, reject) => {
      this.labelService.fetch().subscribe(response => {
        this.labels = response;

        resolve();
      }, err => {
        reject(err);
      });
    });
  }

  toggleLabel(labelTitle) {
    let labelIdx = this.viewOptions.selectedLabels.indexOf(labelTitle);
    labelIdx > -1 ?
      this.viewOptions.selectedLabels.splice(labelIdx, 1) : this.viewOptions.selectedLabels.push(labelTitle);
    this.resetAndLoadRecipes();
  }

  openRecipe(recipe, event?) {
    if (event && event.srcEvent && (event.srcEvent.metaKey || event.srcEvent.ctrlKey)) {
      window.open(`#/recipe/${recipe.id}`);
      return;
    }
    // this.navCtrl.setRoot(RecipePage, {}, {animate: true, direction: 'forward'});
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe.id
    });
  }

  presentPopover(event) {
    let popover = this.popoverCtrl.create('HomePopoverPage', {
      viewOptions: this.viewOptions,
      labels: this.labels
    });

    popover.onDidDismiss(data => {
      if (data && data.refreshSearch) this.resetAndLoadRecipes();
    });

    popover.present({
      ev: event
    });
  }

  newRecipe() {
    this.navCtrl.push('EditRecipePage');
  }

  search(text) {
    if (text.length == 0) {
      this.searchText = '';
      this.resetAndLoadRecipes();
    }

    let loading = this.loadingService.start();

    this.searchText = text;

    return new Promise((resolve, reject) => {
      this.recipeService.search(text, {
        ...(this.viewOptions.selectedLabels.length > 0 ? { labels: this.viewOptions.selectedLabels } : {})
      }).subscribe(response => {
        loading.dismiss();

        this.resetRecipes();
        this.recipes = response.data;

        resolve();
      }, err => {
        loading.dismiss();

        reject();
        switch (err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
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
    });
  }

  trackByFn(index, item) {
    return item.id;
  }

  selectRecipe(recipe) {
    let index = this.selectedRecipeIds.indexOf(recipe.id);
    if (index > -1) {
      this.selectedRecipeIds.splice(index, 1);
    } else {
      this.selectedRecipeIds.push(recipe.id);
    }
  }

  clearSelectedRecipes() {
    this.selectedRecipeIds = [];
  }

  addLabelToSelectedRecipes() {
    const prompt = this.alertCtrl.create({
      title: 'Add Label to Selected Recipes',
      message: "Enter the name for the label",
      inputs: [
        {
          name: 'labelName',
          placeholder: 'Label Name'
        },
      ],
      buttons: [
        {
          text: 'Cancel'
        },
        {
          text: 'Save',
          handler: ({labelName}) => {
            let loading = this.loadingService.start();
            this.labelService.createBulk({
              recipeIds: this.selectedRecipeIds,
              title: labelName.toLowerCase()
            }).subscribe(() => {
              this.resetAndLoadAll().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }, err => {
              switch (err.status) {
                case 0:
                  let offlineToast = this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  let errorToast = this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            })
          }
        }
      ]
    });
    prompt.present();
  }

  deleteSelectedRecipes() {
    let recipeNames = this.selectedRecipeIds.map(recipeId => this.recipes.filter(recipe => recipe.id == recipeId)[0].title).join("<br />");

    let alert = this.alertCtrl.create({
      title: 'Confirm Delete',
      message: 'This will permanently delete the selected recipes from your account. This action is irreversible.<br /><br />The following recipes will be deleted:<br />' + recipeNames,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => { }
        },
        {
          text: 'Delete',
          cssClass: 'alertDanger',
          handler: () => {
            let loading = this.loadingService.start();
            this.recipeService.removeBulk(this.selectedRecipeIds).subscribe(() => {
              this.clearSelectedRecipes();

              this.resetAndLoadAll().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }, err => {
              switch (err.status) {
                case 0:
                  let offlineToast = this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  let errorToast = this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            })
          }
        }
      ]
    });
    alert.present();
  }
}
