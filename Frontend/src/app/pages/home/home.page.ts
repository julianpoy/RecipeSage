import { Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Events, NavController, AlertController, ToastController, PopoverController, IonInfiniteScroll, IonVirtualScroll } from '@ionic/angular';

import { RecipeService, Recipe } from '@/services/recipe.service';
import { MessagingService } from '@/services/messaging.service';
import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService } from '@/services/util.service';

import { LabelService, Label } from '@/services/label.service';

@Component({
  selector: 'page-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage {
  labels: Label[] = [];

  recipes: Recipe[] = [];
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

  @ViewChild(IonInfiniteScroll) infiniteScroll: IonInfiniteScroll;
  @ViewChild(IonVirtualScroll) virtualScroll: IonVirtualScroll;

  constructor(
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public events: Events,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public recipeService: RecipeService,
    public labelService: LabelService,
    public userService: UserService,
    public utilService: UtilService,
    public websocketService: WebsocketService,
    public messagingService: MessagingService) {

    this.folder = this.route.snapshot.paramMap.get('folder') || 'main';
    switch (this.folder) {
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
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  loadViewOptions() {
    var defaults = {
      enableLabelIntersection: false,
      showLabels: true,
      showLabelChips: false,
      showImages: true,
      showSource: false,
      sortBy: '-title',
      selectedLabels: [],
    }

    this.viewOptions.enableLabelIntersection = JSON.parse(localStorage.getItem('enableLabelIntersection'));
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

  updateVirtualScroll(event) {
    // App logic to determine if all data is loaded
    // and disable the infinite scroll
    if (!this.isMoreToScroll()) {
      event.target.disabled = true;
    }

    // Dismiss loader
    event.target.complete();
  }

  isMoreToScroll() {
    return this.lastRecipeCount <= this.totalRecipeCount;
  }

  fetchMoreRecipes(event) {
    if (this.searchText) return;

    if (this.isMoreToScroll()) {
      this.loadRecipes(this.lastRecipeCount, this.fetchPerPage).finally(() => {
        this.updateVirtualScroll(event);
      });
    } else {
      this.updateVirtualScroll(event);
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
        labelIntersection: this.viewOptions.enableLabelIntersection,
        ...(this.viewOptions.selectedLabels.length > 0 ? { labels: this.viewOptions.selectedLabels } : {})
      }).then(response => {

        this.totalRecipeCount = response.totalCount;

        this.recipes.push(...response.data);

        // Rerender Virtual Scroll List After Adding New Data
        this.virtualScroll.checkEnd();

        resolve();
      }).catch(async err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // // this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = await this.toastCtrl.create({
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
      this.labelService.fetch().then(response => {
        this.labels = response;

        resolve();
      }).catch(err => {
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
    this.navCtrl.navigateForward(`recipe/${recipe.id}`);
  }

  async presentPopover(event) {
    let popover = await this.popoverCtrl.create({
      component: 'home-popover-page',
      componentProps: {
        viewOptions: this.viewOptions,
        labels: this.labels
      },
      event
    });

    popover.onDidDismiss().then(({ data }) => {
      if (data && data.refreshSearch) this.resetAndLoadRecipes();
    });

    popover.present();
  }

  newRecipe() {
    this.navCtrl.navigateForward('edit-recipe/new');
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
      }).then(response => {
        loading.dismiss();

        this.resetRecipes();
        this.recipes = response.data;

        resolve();
      }).catch(async err => {
        loading.dismiss();

        reject();
        switch (err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // // this.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = await this.toastCtrl.create({
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

  async addLabelToSelectedRecipes() {
    const prompt = await this.alertCtrl.create({
      header: 'Add Label to Selected Recipes',
      message: 'Enter the name for the label',
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
          handler: ({ labelName }) => {
            let loading = this.loadingService.start();
            this.labelService.createBulk({
              recipeIds: this.selectedRecipeIds,
              title: labelName.toLowerCase()
            }).then(() => {
              this.resetAndLoadAll().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }).catch(async err => {
              switch (err.status) {
                case 0:
                  let offlineToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  let errorToast = await this.toastCtrl.create({
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

  async deleteSelectedRecipes() {
    let recipeNames = this.selectedRecipeIds.map(recipeId => this.recipes.filter(recipe => recipe.id == recipeId)[0].title).join("<br />");

    let alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
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
            this.recipeService.removeBulk(this.selectedRecipeIds).then(() => {
              this.clearSelectedRecipes();

              this.resetAndLoadAll().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }).catch(async err => {
              switch (err.status) {
                case 0:
                  let offlineToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  let errorToast = await this.toastCtrl.create({
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
