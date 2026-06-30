import { Component, Input, Output, EventEmitter, inject } from "@angular/core";
import { LoadingService } from "../../services/loading.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { ServerActionsService } from "../../services/server-actions.service";
import type { RouterOutputs } from "../../services/server-actions/actions-base";
import {
  IonItem,
  IonAvatar,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonIcon,
} from "@ionic/angular/standalone";
import { folderOpenOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];
type DiscoverRecipeAuthor = DiscoverRecipeSummary["author"];

@Component({
  standalone: true,
  selector: "select-discover-recipe",
  templateUrl: "./select-discover-recipe.component.html",
  styleUrls: ["./select-discover-recipe.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonItem,
    IonAvatar,
    IonLabel,
    IonSearchbar,
    IonSpinner,
    IonIcon,
  ],
})
export class SelectDiscoverRecipeComponent {
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  @Input() excludeIds: string[] = [];
  @Output() recipeSelected = new EventEmitter<DiscoverRecipeSummary>();

  searchTimeout?: NodeJS.Timeout;
  searchText = "";
  searching = false;
  PAUSE_BEFORE_SEARCH = 500;

  private UUID_REGEX =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  recipes: DiscoverRecipeSummary[] = [];
  lastQueryWasId = false;

  constructor() {
    addIcons({ folderOpenOutline });
  }

  private extractDiscoverRecipeId(text: string): string | null {
    const match = text.match(this.UUID_REGEX);
    return match ? match[0] : null;
  }

  async search(text: string) {
    const id = this.extractDiscoverRecipeId(text);
    this.lastQueryWasId = !!id;
    if (id) {
      await this.lookupById(id);
      return;
    }

    const loading = this.loadingService.start();

    const response =
      await this.serverActionsService.discover.searchDiscoverRecipes({
        searchTerm: text,
      });
    loading.dismiss();
    this.searching = false;

    if (!response) return;

    this.recipes = response.recipes.filter(
      (recipe) => !this.excludeIds.includes(recipe.id),
    );
  }

  private async lookupById(id: string) {
    const loading = this.loadingService.start();

    const response = await this.serverActionsService.discover.getDiscoverRecipe(
      { id },
      { 404: () => {} },
    );
    loading.dismiss();
    this.searching = false;

    if (!response || this.excludeIds.includes(response.id)) {
      this.recipes = [];
      return;
    }

    this.recipes = [response];
  }

  onSearchInputChange() {
    this.recipes = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    const text = this.searchText.trim();
    if (!text) return;

    this.searching = true;

    this.searchTimeout = setTimeout(() => {
      this.search(text);
    }, this.PAUSE_BEFORE_SEARCH);
  }

  select(recipe: DiscoverRecipeSummary) {
    this.recipeSelected.emit(recipe);
    this.searchText = "";
    this.recipes = [];
  }

  authorDisplay(author: DiscoverRecipeAuthor) {
    return author.handle ? `@${author.handle}` : author.name;
  }

  recipeTrackBy(_: number, recipe: DiscoverRecipeSummary) {
    return recipe.id;
  }
}
