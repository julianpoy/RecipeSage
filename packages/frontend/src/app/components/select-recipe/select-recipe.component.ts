import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "~/services/loading.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ServerActionsService } from "../../services/server-actions.service";
import type {
  RecipeSummary,
  RecipeSummaryLite,
  UserPublic,
} from "@recipesage/prisma";
import {
  IonItem,
  IonAvatar,
  IonLabel,
  IonSearchbar,
  IonBadge,
  IonSpinner,
  IonIcon,
} from "@ionic/angular/standalone";
import { folderOpen } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "select-recipe",
  templateUrl: "select-recipe.component.html",
  styleUrls: ["./select-recipe.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonItem,
    IonAvatar,
    IonLabel,
    IonSearchbar,
    IonBadge,
    IonSpinner,
    IonIcon,
  ],
})
export class SelectRecipeComponent {
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  private myProfileQuery = this.serverActionsService.users.getMe({
    401: () => {},
  });
  myProfile = this.myProfileQuery.value;
  friendsById?: {
    [key: string]: UserPublic;
  };

  searchTimeout?: NodeJS.Timeout;
  searchText = "";
  searching = false;
  PAUSE_BEFORE_SEARCH = 500;

  @Input() includeAllFriends = false;
  @Input() enableSelectedState = true;

  _selectedRecipe?: RecipeSummary;
  @Input()
  get selectedRecipe() {
    return this._selectedRecipe;
  }

  set selectedRecipe(val: RecipeSummary | undefined) {
    this._selectedRecipe = val;
    this.selectedRecipeChange.emit(this._selectedRecipe);
  }

  @Output() selectedRecipeChange = new EventEmitter<RecipeSummary>();

  recipes: RecipeSummaryLite[] = [];

  constructor() {
    addIcons({ folderOpen });
    this.fetchFriends();
  }

  async fetchFriends() {
    const response = await this.serverActionsService.users.getMyFriends({
      401: () => {},
    });
    if (!response) return;

    this.friendsById = response.friends.reduce(
      (acc, friendEntry) => {
        acc[friendEntry.id] = friendEntry;
        return acc;
      },
      {} as Record<string, UserPublic>,
    );
  }

  async search(text: string) {
    const loading = this.loadingService.start();

    const response = await this.serverActionsService.recipes.searchRecipes({
      searchTerm: text,
      folder: "main",
      includeAllFriends: this.includeAllFriends,
    });
    loading.dismiss();
    this.searching = false;

    if (!response) return;

    this.recipes = response.recipes;
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

  async selectRecipe(recipe: RecipeSummaryLite) {
    this.searchText = "";

    const response = await this.serverActionsService.recipes.getRecipe({
      id: recipe.id,
    });
    if (!response) return;

    if (this.enableSelectedState) {
      this.selectedRecipe = response;
    } else {
      this.selectedRecipeChange.emit(response);
    }
  }

  recipeTrackBy(index: number, recipe: RecipeSummary | RecipeSummaryLite) {
    return recipe.id;
  }
}
