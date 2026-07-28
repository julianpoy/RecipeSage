import { Component, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NavController } from "@ionic/angular/standalone";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonLabel,
  IonToggle,
  IonSpinner,
  IonButton,
} from "@ionic/angular/standalone";
import { addIcons } from "ionicons";
import {
  basketOutline,
  restaurantOutline,
  searchOutline,
} from "ionicons/icons";

import { RouteMap, UtilService } from "../../../services/util.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { RouterOutputs } from "../../../services/server-actions/actions-base";
import type { RecipeSummaryLite } from "@recipesage/prisma";
import { PreferencesService } from "../../../services/preferences.service";
import {
  MyRecipesPreferenceKey,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH,
  SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS,
} from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { InfoBlockComponent } from "../../../components/info-block/info-block.component";
import { TextAreaComponent } from "../../../components/forms/text-area/text-area.component";
import { RecipeListItemComponent } from "../../../components/recipe-list-item/recipe-list-item.component";
import { NullStateComponent } from "../../../components/null-state/null-state.component";

type IngredientSearchResult =
  RouterOutputs["recipes"]["searchRecipesByIngredients"]["results"][number];

@Component({
  standalone: true,
  selector: "page-search-by-ingredients",
  templateUrl: "search-by-ingredients.page.html",
  styleUrls: ["search-by-ingredients.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonLabel,
    IonToggle,
    IonSpinner,
    IonButton,
    InfoBlockComponent,
    TextAreaComponent,
    RecipeListItemComponent,
    NullStateComponent,
  ],
})
export class SearchByIngredientsPage {
  private navCtrl = inject(NavController);
  private utilService = inject(UtilService);
  private serverActionsService = inject(ServerActionsService);
  private preferencesService = inject(PreferencesService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  private myProfileQuery = this.serverActionsService.users.getMe({
    401: () => {},
  });
  myProfile = this.myProfileQuery.value;

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  ingredientsText = "";
  includeFriends = false;

  loading = false;
  hasSearched = false;
  totalTerms = 0;
  results: IngredientSearchResult[] = [];

  private searchGeneration = 0;

  constructor() {
    addIcons({
      basketOutline,
      restaurantOutline,
      searchOutline,
    });
  }

  get viewType(): "list" | "compact" {
    return this.preferences[this.preferenceKeys.ViewType] === "compact"
      ? "compact"
      : "list";
  }

  onIncludeFriendsChange() {
    if (this.hasSearched) this.search();
  }

  private parseTerms(text: string): string[] {
    const seen = new Set<string>();
    const terms: string[] = [];

    for (const raw of text.split(/[\n,]+/)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (trimmed.length > SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERM_LENGTH)
        continue;

      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      terms.push(trimmed);

      if (terms.length >= SEARCH_RECIPES_BY_INGREDIENTS_MAX_TERMS) break;
    }

    return terms;
  }

  async search() {
    const terms = this.parseTerms(this.ingredientsText);
    const generation = ++this.searchGeneration;

    if (!terms.length) {
      this.loading = false;
      this.hasSearched = false;
      this.totalTerms = 0;
      this.results = [];
      return;
    }

    this.loading = true;

    const response = await this.serverActionsService.recipes
      .searchRecipesByIngredients({
        ingredients: terms,
        includeAllFriends: this.includeFriends || undefined,
      })
      .finally(() => {
        if (generation === this.searchGeneration) this.loading = false;
      });

    if (generation !== this.searchGeneration) return;
    if (!response) return;

    this.hasSearched = true;
    this.totalTerms = terms.length;
    this.results = response.results;
  }

  private isFromAnotherUser(recipe: RecipeSummaryLite): boolean {
    const myProfileValue = this.myProfile();
    return !!myProfileValue && recipe.userId !== myProfileValue.id;
  }

  getRecipeBadgeHandle(recipe: RecipeSummaryLite): string | undefined {
    if (!this.isFromAnotherUser(recipe)) return undefined;
    return recipe.user.handle ?? undefined;
  }

  isFromSharedCollection(recipe: RecipeSummaryLite): boolean {
    if (!this.isFromAnotherUser(recipe)) return false;
    return !recipe.user.handle;
  }

  openRecipe(recipe: RecipeSummaryLite, event?: MouseEvent | KeyboardEvent) {
    this.utilService.openRecipe(this.navCtrl, recipe.id, event);
  }
}
