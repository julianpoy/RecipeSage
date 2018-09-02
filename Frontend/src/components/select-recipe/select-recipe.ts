import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';
import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';
import { ToastController, NavController } from 'ionic-angular';

@Component({
  selector: 'select-recipe',
  templateUrl: 'select-recipe.html'
})
export class SelectRecipeComponent {

  searchWorker: any;
  searchText: string = '';
  searching: boolean = false;

  _selectedRecipe: any;
  @Input()
  get selectedRecipe() {
    return this._selectedRecipe;
  }

  set selectedRecipe(val) {
    this._selectedRecipe = val;
    this.selectedRecipeChange.emit(this._selectedRecipe);
  }

  @Output() selectedRecipeChange = new EventEmitter();

  recipes: any = [];
  showAutocomplete: boolean = false;
  autocompleteSelectionIdx: number = -1;

  constructor(
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public toastCtrl: ToastController,
    public navCtrl: NavController
  ) {
    var loading = this.loadingService.start();

    this.loadRecipes().then(function () {
      loading.dismiss();
    }, function () {
      loading.dismiss();
    });
  }

  loadRecipes() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.recipeService.fetch({
        folder: 'main',
        sortBy: 'title',
      }).subscribe(function (response) {

        if (me.searchWorker) me.searchWorker.terminate();
        me.searchWorker = new Worker('assets/src/search-worker.js');

        me.searchWorker.postMessage(JSON.stringify({
          op: 'init',
          data: response
        }));

        me.searchWorker.onmessage = function (e) {
          me.searching = false;
          var message = JSON.parse(e.data);
          if (message.op === 'results') {
            me.recipes = message.data;
          }
        }

        me.recipes = response;

        resolve();
      }, function (err) {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.offlineFetchMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  onSearchInputChange() {
    this.search(this.searchText);
  }

  search(text) {
    if (!text) text = '';
    this.searchText = text;
    this.searchWorker.postMessage(JSON.stringify({
      op: 'search',
      data: text
    }));
    this.searching = true;
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
    this.autocompleteSelectionIdx = -1;
  }

  labelFieldKeyUp(event) {
    // Only listen for up or down arrow
    if (event.keyCode !== 38 && event.keyCode !== 40) return;

    // Get all suggestions (including click to create)
    var suggestions = document.getElementsByClassName('autocomplete')[0].children;

    // If result list size was reduced, do not overflow
    if (this.autocompleteSelectionIdx > suggestions.length - 1) this.autocompleteSelectionIdx = suggestions.length - 1;

    if (event.keyCode === 40 && this.autocompleteSelectionIdx < suggestions.length - 1) {
      // Arrow Down
      this.autocompleteSelectionIdx++;
    } else if (event.keyCode === 38 && this.autocompleteSelectionIdx >= 0) {
      // Arrow Up
      this.autocompleteSelectionIdx--;
    }

    if (this.autocompleteSelectionIdx === -1) {
      (document.getElementById('labelInputField') as HTMLElement).focus();
    } else {
      (suggestions[this.autocompleteSelectionIdx] as HTMLElement).focus();
    }
  }

  selectRecipe(recipe) {
    this.searchText = '';
    this.toggleAutocomplete(false);

    var me = this;
    this.recipeService.fetchById(recipe._id).subscribe(function (response) {
      me.selectedRecipe = response;
    }, function (err) {
      switch (err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, { animate: true, direction: 'forward' });
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
}
