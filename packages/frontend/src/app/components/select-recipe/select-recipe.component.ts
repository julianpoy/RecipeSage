import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { UtilService } from "~/services/util.service";
import { Recipe, RecipeService } from "~/services/recipe.service";
import { ToastController, NavController } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  selector: "select-recipe",
  templateUrl: "select-recipe.component.html",
  styleUrls: ["./select-recipe.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectRecipeComponent {
  loadingService = inject(LoadingService);
  utilService = inject(UtilService);
  recipeService = inject(RecipeService);
  toastCtrl = inject(ToastController);
  navCtrl = inject(NavController);

  searchTimeout?: NodeJS.Timeout;
  searchText = "";
  searching = false;
  PAUSE_BEFORE_SEARCH = 500;

  _selectedRecipe?: Recipe;
  @Input()
  get selectedRecipe() {
    return this._selectedRecipe;
  }

  set selectedRecipe(val: Recipe | undefined) {
    this._selectedRecipe = val;
    this.selectedRecipeChange.emit(this._selectedRecipe);
  }

  @Output() selectedRecipeChange = new EventEmitter();

  recipes: Recipe[] = [];

  async search(text: string) {
    const loading = this.loadingService.start();

    const response = await this.recipeService.search({
      query: text,
    });
    loading.dismiss();
    this.searching = false;

    if (!response.success) return;

    this.recipes = response.data.data;
  }

  onSearchInputChange(event: any) {
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

  async selectRecipe(recipe: Recipe) {
    this.searchText = "";

    const response = await this.recipeService.fetchById(recipe.id);
    if (!response.success) return;

    this.selectedRecipe = response.data;
  }

  recipeTrackBy(index: number, recipe: Recipe) {
    return recipe.id;
  }
}
