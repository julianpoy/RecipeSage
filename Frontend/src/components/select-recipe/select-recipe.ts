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

  searchTimeout;
  searchText: string = '';
  searching: boolean = false;
  PAUSE_BEFORE_SEARCH: number = 500;

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
  ) {}

  search(text) {
    let loading = this.loadingService.start();

    this.recipeService.search(text, {}).subscribe(response => {
      this.recipes = response.data;

      loading.dismiss();
      this.searching = false;
    }, err => {
      loading.dismiss();
      this.searching = false;

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

  onSearchInputChange() {
    this.recipes = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchText) return;

    this.searching = true;

    this.searchTimeout = setTimeout(() => {
      this.search(this.searchText);
    }, this.PAUSE_BEFORE_SEARCH);
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
