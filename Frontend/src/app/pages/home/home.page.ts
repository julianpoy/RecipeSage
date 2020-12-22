import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ToastController, PopoverController } from '@ionic/angular';

import { RecipeService, Recipe } from '@/services/recipe.service';
import { MessagingService } from '@/services/messaging.service';
import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { WebsocketService } from '@/services/websocket.service';
import { EventService } from '@/services/event.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

import { LabelService, Label } from '@/services/label.service';
import { PreferencesService, MyRecipesPreferenceKey } from '@/services/preferences.service';
import { HomePopoverPage } from '@/pages/home-popover/home-popover.page';

@Component({
  selector: 'page-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss']
})
export class HomePage implements AfterViewInit {
  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  labels: Label[] = [];
  selectedLabels: string[] = [];

  recipes: Recipe[] = [];
  recipeFetchBuffer = 25;
  fetchPerPage = 50;
  lastRecipeCount = 0;
  totalRecipeCount: number;

  loading = true;
  selectedRecipeIds: string[] = [];
  selectionMode = false;

  searchText = '';

  folder: string;
  folderTitle: string;

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  reloadPending = true;

  @ViewChild('contentContainer', { static: true }) contentContainer;
  scrollElement;

  userId = null;

  constructor(
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public events: EventService,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public recipeService: RecipeService,
    public labelService: LabelService,
    public userService: UserService,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
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
    this.selectedLabels = (this.route.snapshot.queryParamMap.get('labels') || '').split(',').filter(e => e);
    this.userId = this.route.snapshot.queryParamMap.get('userId') || null;
    if (this.userId) {
      if (this.selectedLabels.length) {
        this.folderTitle = `Shared Label: ${this.selectedLabels[0]}`;
      } else {
        this.folderTitle = 'Shared Recipes';
      }
      this.userService.getProfileByUserId(this.userId).then(profile => {
        this.folderTitle = `${profile.name}'s ${this.folderTitle}`;
      });
    }
    this.setDefaultBackHref();

    events.subscribe('recipe:created', () => this.reloadPending = true);
    events.subscribe('recipe:modified', () => this.reloadPending = true);
    events.subscribe('recipe:deleted', () => this.reloadPending = true);
    events.subscribe('label:created', () => this.reloadPending = true);
    events.subscribe('label:deleted', () => this.reloadPending = true);
    events.subscribe('import:pepperplate:complete', () => {
      const loading = this.loadingService.start();
      this.resetAndLoadAll().then(() => {
        loading.dismiss();
      }, () => {
        loading.dismiss();
      });
    });

    this.websocketService.register('messages:new', payload => {
      if (payload.recipe && this.folder === 'inbox') {
        this.resetAndLoadRecipes();
      }
    }, this);
  }

  ngAfterViewInit() {
    this.getScrollElement();
  }

  ionViewWillEnter() {
    this.clearSelectedRecipes();

    if (this.reloadPending) {
      const loading = this.loadingService.start();
      this.resetAndLoadAll().then(() => {
        loading.dismiss();
      }, () => {
        loading.dismiss();
      });
    }
  }

  async setDefaultBackHref() {
    if (this.userId) {
      const profile = await this.userService.getProfileByUserId(this.userId);

      this.defaultBackHref = RouteMap.ProfilePage.getPath(`@${profile.handle}`);
    }
  }

  fetchMoreRecipes(event) {
    if (this.searchText) return;

    const shouldFetchMore = this.lastRecipeCount < event.endIndex + this.recipeFetchBuffer;

    const moreToScroll = this.lastRecipeCount <= this.totalRecipeCount;
    if (shouldFetchMore && moreToScroll) {
      this.loadRecipes(this.lastRecipeCount, this.fetchPerPage);
    }
  }

  resetAndLoadAll(): Promise<any> {
    this.reloadPending = false;

    // Load labels & recipes in parallel if user hasn't selected labels that need to be verified for existence
    // Or if we're loading someone elses collection (in which case we can't verify)
    if (this.selectedLabels.length === 0 || this.userId) {
      return Promise.all([
        this.resetAndLoadLabels(),
        this.resetAndLoadRecipes()
      ]);
    }

    return this.resetAndLoadLabels().then(() => {
      const labelNames = this.labels.map(e => e.title);

      this.selectedLabels.splice(0, this.selectedLabels.length, ...this.selectedLabels.filter(e => labelNames.indexOf(e) > -1));

      return this.resetAndLoadRecipes();
    });
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
    });
  }

  _resetAndLoadRecipes() {
    if (this.searchText && this.searchText.trim().length > 0) {
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
        userId: this.userId,
        sortBy: this.preferences[MyRecipesPreferenceKey.SortBy],
        offset,
        count: numToFetch,
        labelIntersection: this.preferences[MyRecipesPreferenceKey.EnableLabelIntersection],
        ...(this.selectedLabels.length > 0 ? { labels: this.selectedLabels } : {})
      }).then(response => {

        this.totalRecipeCount = response.totalCount;

        this.recipes = this.recipes.concat(response.data);

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          case 404:
            const noAccessToast = await this.toastCtrl.create({
              message: 'It seems like you don\'t have access to this resource',
              duration: 5000
            });
            noAccessToast.present();
            break;
          default:
            const errorToast = await this.toastCtrl.create({
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
    const labelIdx = this.selectedLabels.indexOf(labelTitle);
    labelIdx > -1 ?
      this.selectedLabels.splice(labelIdx, 1) : this.selectedLabels.push(labelTitle);
    this.resetAndLoadRecipes();
  }

  openRecipe(recipe, event?) {
    if (event && (event.metaKey || event.ctrlKey)) {
      window.open(`#/recipe/${recipe.id}`);
      return;
    }
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipe.id));
  }

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: HomePopoverPage,
      componentProps: {
        guestMode: !!this.userId,
        labels: this.labels,
        selectedLabels: this.selectedLabels,
        selectionMode: this.selectionMode
      },
      event
    });

    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      if (data.refreshSearch) this.resetAndLoadRecipes();
      if (typeof data.selectionMode === 'boolean') {
        this.selectionMode = data.selectionMode;
        if (!this.selectionMode) {
          this.clearSelectedRecipes();
        }
      }
    });

    popover.present();
  }

  async getScrollElement() {
    this.scrollElement = await this.contentContainer.getScrollElement();
  }

  newRecipe() {
    this.navCtrl.navigateForward(RouteMap.EditRecipePage.getPath('new'));
  }

  search(text) {
    if (text.trim().length === 0) {
      this.searchText = '';
      this.resetAndLoadRecipes();
      return;
    }

    const loading = this.loadingService.start();

    this.searchText = text;

    return new Promise((resolve, reject) => {
      this.recipeService.search(text, {
        ...(this.selectedLabels.length > 0 ? { labels: this.selectedLabels } : {}),
        userId: this.userId || undefined,
      }).then(response => {
        loading.dismiss();

        this.resetRecipes();
        this.recipes = response.data;

        resolve();
      }).catch(async err => {
        loading.dismiss();

        reject();
        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
            break;
          default:
            const errorToast = await this.toastCtrl.create({
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
    const index = this.selectedRecipeIds.indexOf(recipe.id);
    if (index > -1) {
      this.selectedRecipeIds.splice(index, 1);
    } else {
      this.selectedRecipeIds.push(recipe.id);
    }
  }

  clearSelectedRecipes() {
    this.selectionMode = false;
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
            const loading = this.loadingService.start();
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
              switch (err.response.status) {
                case 0:
                  const offlineToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  const errorToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            });
          }
        }
      ]
    });
    prompt.present();
  }

  async deleteSelectedRecipes() {
    const recipeNames = this.selectedRecipeIds.map(recipeId => this.recipes.filter(recipe => recipe.id === recipeId)[0].title)
                                              .join('<br />');

    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: `This will permanently delete the selected recipes from your account. This action is irreversible.<br /><br />
                The following recipes will be deleted:<br />${recipeNames}`,
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
            const loading = this.loadingService.start();
            this.recipeService.removeBulk(this.selectedRecipeIds).then(() => {
              this.clearSelectedRecipes();

              this.resetAndLoadAll().then(() => {
                loading.dismiss();
              }, () => {
                loading.dismiss();
              });
            }).catch(async err => {
              switch (err.response.status) {
                case 0:
                  const offlineToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.offlinePushMessage,
                    duration: 5000
                  });
                  offlineToast.present();
                  break;
                default:
                  const errorToast = await this.toastCtrl.create({
                    message: this.utilService.standardMessages.unexpectedError,
                    duration: 30000
                  });
                  errorToast.present();
                  break;
              }
            });
          }
        }
      ]
    });
    alert.present();
  }
}
