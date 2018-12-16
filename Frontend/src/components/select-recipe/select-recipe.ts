import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';
import { RecipeServiceProvider } from '../../providers/recipe-service/recipe-service';
import { ToastController, NavController } from 'ionic-angular';

import SearchWorker from 'worker-loader!../../assets/src/recipe-search.worker';

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

  constructor(
    public loadingService: LoadingServiceProvider,
    public utilService: UtilServiceProvider,
    public recipeService: RecipeServiceProvider,
    public toastCtrl: ToastController,
    public navCtrl: NavController
  ) {
    var loading = this.loadingService.start();

    this.loadRecipes().then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });
  }

  loadRecipes() {
    return new Promise((resolve, reject) => {
      this.recipeService.fetch({
        folder: 'main',
        sortBy: 'title',
      }).subscribe(response => {

        if (this.searchWorker) this.searchWorker.terminate();
        this.searchWorker = new SearchWorker();

        this.searchWorker.postMessage(JSON.stringify({
          op: 'init',
          data: response
        }));

        this.searchWorker.onmessage = e => {
          this.searching = false;
          var message = JSON.parse(e.data);
          if (message.op === 'results') {
            this.recipes = message.data;
          }
        }

        this.recipes = response;

        resolve();
      }, err => {
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

  selectRecipe(recipe) {
    this.searchText = '';

    this.recipeService.fetchById(recipe.id).subscribe(response => {
      this.selectedRecipe = response;
    }, err => {
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
  }
}
