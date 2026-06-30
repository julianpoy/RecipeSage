import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController, PopoverController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { Datasource, UiScrollModule } from "ngx-ui-scroll";
import {
  MyRecipesPreferenceKey,
  GlobalPreferenceKey,
} from "@recipesage/util/shared";

import { RouteMap } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { PreferencesService } from "../../../services/preferences.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import type { RouterOutputs } from "../../../services/server-actions/actions-base";
import {
  getDiscoverLanguageOptions,
  getDefaultDiscoverLanguages,
  DiscoverLanguageOption,
} from "../../../utils/discoverLanguages";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { RatingComponent } from "../../../components/rating/rating.component";
import {
  DiscoverFilterPopoverPage,
  DiscoverFilterResult,
  DiscoverSortBy,
  DiscoverPhotoFilter,
} from "../discover-filter-popover/discover-filter-popover.page";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { search, options } from "ionicons/icons";
import { addIcons } from "ionicons";

type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];
type DiscoverRecipeAuthor = DiscoverRecipeSummary["author"];

const PAGE_SIZE = 40;
const TILE_WIDTH = 200;
const TILE_PADD = 20;

@Component({
  standalone: true,
  selector: "page-discover",
  templateUrl: "discover.page.html",
  styleUrls: ["discover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    RatingComponent,
    UiScrollModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonButton,
    IonIcon,
  ],
})
export class DiscoverPage {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);
  private popoverCtrl = inject(PopoverController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private preferencesService = inject(PreferencesService);
  private serverActionsService = inject(ServerActionsService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  languageOptions: DiscoverLanguageOption[] = [];

  searchTerm = "";
  selectedLanguages: string[] = [];
  selectedCategories: string[] = [];
  matchAllCategories = false;
  minRating = 0;
  minRatingCount = 0;
  photo: DiscoverPhotoFilter = "optional";
  sortBy: DiscoverSortBy = "trending";

  loadedAny = false;
  recipes: DiscoverRecipeSummary[] = [];
  reachedEnd = false;
  tileColCount = 1;

  datasource = new Datasource<DiscoverRecipeSummary>({
    get: async (index: number, count: number) => {
      const isTiled =
        this.preferences[MyRecipesPreferenceKey.ViewType] === "tiles";

      const realIndex = isTiled ? index * this.tileColCount : index;
      const realCount = isTiled ? count * this.tileColCount : count;

      await this.fetchUntil(realIndex + realCount);

      const slice = this.recipes.slice(
        Math.max(realIndex, 0),
        realIndex + realCount,
      );

      if (isTiled) {
        const groups = [];
        const groupCount = Math.ceil(slice.length / this.tileColCount);
        for (let i = 0; i < groupCount; i++) {
          const start = i * this.tileColCount;
          groups.push(slice.slice(start, start + this.tileColCount));
        }
        return groups;
      }

      return slice;
    },
    settings: {
      minIndex: 0,
      startIndex: 0,
      bufferSize: 10,
      padding: 0.5,
    },
  });

  constructor() {
    addIcons({ search, options });
    this.languageOptions = getDiscoverLanguageOptions(
      this.translate.currentLang,
    );
    this.selectedLanguages = getDefaultDiscoverLanguages(
      this.translate.currentLang,
    );
  }

  ionViewWillEnter() {
    const categoriesParam = this.route.snapshot.queryParamMap.get("categories");
    if (categoriesParam) {
      this.selectedCategories = categoriesParam
        .split(",")
        .map((category) => decodeURIComponent(category))
        .filter((category) => category.length > 0);
    }

    window.addEventListener("resize", this.updateTileColCount);
    this.computeTileColCount();
    this.reload();
  }

  ionViewWillLeave() {
    window.removeEventListener("resize", this.updateTileColCount);
  }

  private computeTileColCount(): boolean {
    const isSidebarEnabled =
      this.preferences[GlobalPreferenceKey.EnableSplitPane];
    const isSidebarOpen = window.innerWidth >= 1200;
    const sidebarWidth = isSidebarEnabled && isSidebarOpen ? 300 : 0;
    const pageWidth = window.innerWidth - sidebarWidth;
    const tileColCount = Math.max(
      Math.floor(pageWidth / (TILE_WIDTH + TILE_PADD)),
      1,
    );
    if (tileColCount !== this.tileColCount) {
      this.tileColCount = tileColCount;
      return true;
    }
    return false;
  }

  updateTileColCount = () => {
    if (this.computeTileColCount()) {
      this.reload();
    }
  };

  authorDisplay(author: DiscoverRecipeAuthor) {
    return author.handle ? `@${author.handle}` : author.name;
  }

  searchFieldEnter(event: Event) {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.onSearchChange(target.value);
    }
  }

  onSearchChange(value: string) {
    this.searchTerm = value;
    this.reload();
  }

  async openFilters(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: DiscoverFilterPopoverPage,
      componentProps: {
        languageOptions: this.languageOptions,
        selectedLanguages: [...this.selectedLanguages],
        selectedCategories: [...this.selectedCategories],
        matchAllCategories: this.matchAllCategories,
        minRating: this.minRating,
        minRatingCount: this.minRatingCount,
        photo: this.photo,
        sortBy: this.sortBy,
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss<DiscoverFilterResult>();
    if (!data) return;

    this.selectedLanguages = data.languages;
    this.selectedCategories = data.categories;
    this.matchAllCategories = data.matchAllCategories;
    this.minRating = data.minRating;
    this.minRatingCount = data.minRatingCount;
    this.photo = data.photo;
    this.sortBy = data.sortBy;
    if (data.refreshSearch) this.reload();
  }

  async reload() {
    const loading = this.loadingService.start();
    this.recipes = [];
    this.reachedEnd = false;
    this.loadedAny = false;
    this.datasource.settings!.startIndex = 0;
    await this.datasource.adapter.reset();
    loading.dismiss();
  }

  private async fetchUntil(target: number) {
    while (!this.reachedEnd && this.recipes.length < target) {
      const fetched = await this.fetchPage(this.recipes.length);
      if (!fetched) break;
    }
  }

  private async fetchPage(offset: number): Promise<boolean> {
    const response =
      await this.serverActionsService.discover.searchDiscoverRecipes({
        searchTerm: this.searchTerm.trim() || undefined,
        languages: this.selectedLanguages.length
          ? this.selectedLanguages
          : undefined,
        categories: this.selectedCategories.length
          ? this.selectedCategories
          : undefined,
        matchAllCategories: this.matchAllCategories || undefined,
        minRating: this.minRating || undefined,
        minRatingCount: this.minRatingCount || undefined,
        photo: this.photo,
        sortBy: this.sortBy,
        offset,
        limit: PAGE_SIZE,
      });

    if (!response) return false;

    for (let i = 0; i < response.recipes.length; i++) {
      this.recipes[offset + i] = response.recipes[i];
    }

    this.loadedAny = true;
    if (response.recipes.length < PAGE_SIZE) {
      this.reachedEnd = true;
    }

    return response.recipes.length > 0;
  }

  openRecipe(recipe: DiscoverRecipeSummary) {
    this.navCtrl.navigateForward(
      RouteMap.DiscoverRecipePage.getPath(recipe.id),
    );
  }
}
