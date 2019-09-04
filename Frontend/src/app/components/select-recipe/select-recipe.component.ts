import { Component, Input, Output, EventEmitter } from '@angular/core';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';
import { RecipeService } from '@/services/recipe.service';
import { ToastController, NavController } from '@ionic/angular';

@Component({
  selector: 'select-recipe',
  templateUrl: 'select-recipe.component.html',
  styleUrls: ['./select-recipe.component.scss']
})
export class SelectRecipeComponent {

  searchTimeout;
  searchText = '';
  searching = false;
  PAUSE_BEFORE_SEARCH = 500;

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
    public loadingService: LoadingService,
    public utilService: UtilService,
    public recipeService: RecipeService,
    public toastCtrl: ToastController,
    public navCtrl: NavController
  ) {}

  search(text: string) {
    const loading = this.loadingService.start();

    this.recipeService.search(text, {}).then(response => {
      this.recipes = response.data;

      loading.dismiss();
      this.searching = false;
    }).catch(async err => {
      loading.dismiss();
      this.searching = false;

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
  }

  onSearchInputChange(event) {
    this.searchText = event.detail.value;

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

    this.recipeService.fetchById(recipe.id).then(response => {
      this.selectedRecipe = response;
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
