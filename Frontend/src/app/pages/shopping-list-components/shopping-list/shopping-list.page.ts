import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, ModalController, PopoverController } from '@ionic/angular';

import { LoadingService } from '@/services/loading.service';
import { ShoppingListService } from '@/services/shopping-list.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

import { NewShoppingListItemModalPage } from '../new-shopping-list-item-modal/new-shopping-list-item-modal.page';
import { ShoppingListPopoverPage } from '../shopping-list-popover/shopping-list-popover.page';

@Component({
  selector: 'page-shopping-list',
  templateUrl: 'shopping-list.page.html',
  styleUrls: ['shopping-list.page.scss']
})
export class ShoppingListPage {

  defaultBackHref: string = RouteMap.ShoppingListsPage.getPath();

  shoppingListId: string;
  list: any = { items: [], collaborators: [] };

  itemsByRecipeId: any = {};
  recipeIds: any = [];

  viewOptions: any = {};

  initialLoadComplete = false;

  reference = 0;

  constructor(
    public navCtrl: NavController,
    public loadingService: LoadingService,
    public shoppingListService: ShoppingListService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public route: ActivatedRoute) {

    this.shoppingListId = this.route.snapshot.paramMap.get('shoppingListId');

    this.websocketService.register('shoppingList:itemsUpdated', payload => {
      if (payload.shoppingListId === this.shoppingListId && payload.reference !== this.reference) {
        this.loadList();
      }
    }, this);

    this.loadViewOptions();
  }


  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.initialLoadComplete = false;
    this.loadList().then(() => {
      loading.dismiss();
      this.initialLoadComplete = true;
    }, () => {
      loading.dismiss();
      this.initialLoadComplete = true;
    });
  }

  refresh(loader) {
    this.loadList().then(() => {
      loader.target.complete();
    }, () => {
      loader.target.complete();
    });
  }

  processIncomingList(list) {
    this.list = list;
    this.applySort();

    const items = (this.list.items || []);

    this.recipeIds = [];
    this.itemsByRecipeId = {};

    for (const item of items) {
      // Recipe grouping
      if (!item.recipe) continue;

      const recipeId = item.recipe.id + item.createdAt;

      if (this.recipeIds.indexOf(recipeId) === -1) this.recipeIds.push(recipeId);

      if (!this.itemsByRecipeId[recipeId]) this.itemsByRecipeId[recipeId] = [];
      this.itemsByRecipeId[recipeId].push(item);
    }
  }

  loadList() {
    return new Promise((resolve, reject) => {
      this.shoppingListService.fetchById(this.shoppingListId).then(response => {
        this.processIncomingList(response);

        resolve();
      }).catch(async err => {
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
            let errorToast = await this.toastCtrl.create({
              message: 'Shopping list not found. Does this shopping list URL exist?',
              showCloseButton: true
            });
            errorToast.present();

            this.navCtrl.navigateBack(RouteMap.ShoppingListsPage.getPath());
            break;
          default:
            errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              showCloseButton: true
            });
            errorToast.present();
            break;
        }

        reject();
      });
    });
  }

  removeRecipe(recipeId) {
    this.removeItems(this.itemsByRecipeId[recipeId]);
  }

  removeItems(items) {
    const loading = this.loadingService.start();

    const itemIds = items.map(el => {
      return el.id;
    });

    this.shoppingListService.remove({
      id: this.list.id,
      items: itemIds
    }).then(response => {
      this.reference = response.reference || 0;

      this.loadList().then(async () => {
        loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: 'Removed ' + items.length + ' item' + (items.length > 1 ? 's' : ''),
          duration: 5000,
          buttons: [{
            text: 'Undo',
            role: 'cancel',
            handler: () => {
              this._addItems(items.map(el => {
                return {
                  title: el.title,
                  id: el.shoppingListId,
                  mealPlanItemId: (el.mealPlanItem || {}).id || null,
                  recipeId: (el.recipe || {}).id || null
                };
              }));
            }
          }]
        });
        toast.present();
      });
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }

  _addItems(items) {
    const loading = this.loadingService.start();

    this.shoppingListService.addItems({
      id: this.list.id,
      items
    }).then(response => {
      this.reference = response.reference || 0;

      this.loadList().then(loading.dismiss);
    }).catch(async err => {
      loading.dismiss();
      switch (err.response.status) {
        case 0:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          })).present();
          break;
        case 401:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unauthorized,
            duration: 6000
          })).present();
          break;
        default:
          (await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 6000
          })).present();
          break;
      }
    });
  }

  async newShoppingListItem() {
    const modal = await this.modalCtrl.create({
      component: NewShoppingListItemModalPage
    });
    modal.present();
    modal.onDidDismiss().then(({ data }) => {
      if (!data || !data.items) return;
      this._addItems(data.items);
    });
  }

  formatItemCreationDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true });
  }

  loadViewOptions() {
    const defaults = {
      sortBy: '-createdAt',
      showAddedBy: false,
      showAddedOn: false,
      showRecipeTitle: true,
      groupSimilar: false
    };

    this.viewOptions.sortBy = localStorage.getItem('shoppingList.sortBy');
    this.viewOptions.showAddedBy = JSON.parse(localStorage.getItem('shoppingList.showAddedBy'));
    this.viewOptions.showAddedOn = JSON.parse(localStorage.getItem('shoppingList.showAddedOn'));
    this.viewOptions.showRecipeTitle = JSON.parse(localStorage.getItem('shoppingList.showRecipeTitle'));
    this.viewOptions.groupSimilar = JSON.parse(localStorage.getItem('shoppingList.groupSimilar'));

    for (const key in this.viewOptions) {
      if (this.viewOptions.hasOwnProperty(key)) {
        if (this.viewOptions[key] == null) {
          this.viewOptions[key] = defaults[key];
        }
      }
    }
  }

  ingredientSorter(a, b) {
    switch (this.viewOptions.sortBy) {
      case 'createdAt':
        const dateComp = (new Date(a.createdAt) as any) - (new Date(b.createdAt) as any);
        if (dateComp === 0) {
          return a.title.localeCompare(b.title);
        }
        return dateComp;
      case '-createdAt':
        const reverseDateComp = (new Date(b.createdAt) as any) - (new Date(a.createdAt) as any);
        if (reverseDateComp === 0) {
          return a.title.localeCompare(b.title);
        }
        return reverseDateComp;
      case '-title':
      default:
        const localeComp = a.title.localeCompare(b.title);
        if (localeComp === 0) {
          return (new Date(a.createdAt) as any) - (new Date(b.createdAt) as any);
        }
        return localeComp;
    }
  }

  applySort() {
    // Sort individual items
    this.list.items = this.list.items.sort((a, b) => {
      return this.ingredientSorter(a, b);
    });

    // Sort groups by title (always)
    this.list.itemsByGroup = this.list.itemsByGroup.sort((a, b) => {
      return a.title.localeCompare(b.title);
    });

    // Sort items within each group
    for (const itemGroup of this.list.itemsByGroup) {
      itemGroup.items = itemGroup.items.sort((a, b) => {
        return this.ingredientSorter(a, b);
      });
    }
  }

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: ShoppingListPopoverPage,
      componentProps: {
        shoppingListId: this.shoppingListId,
        shoppingList: this.list,
        viewOptions: this.viewOptions
      },
      event
    });

    popover.onDidDismiss().then(() => {
      this.applySort();
    });

    popover.present();
  }
}
