import { Component, inject, ChangeDetectionStrategy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NavController, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";
import { Datasource, UiScrollModule } from "ngx-ui-scroll";
import {
  MyRecipesPreferenceKey,
  GlobalPreferenceKey,
  SEARCH_TERM_LENGTH_LIMIT,
} from "@recipesage/util/shared";

import { RouteMap, UtilService } from "../../../services/util.service";
import { LoadingService } from "../../../services/loading.service";
import { PreferencesService } from "../../../services/preferences.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { EventName, EventService } from "../../../services/event.service";
import { NativeTabBarService } from "../../../services/native-tab-bar.service";
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
  DiscoverPhotoFilter,
} from "../discover-filter-popover/discover-filter-popover.page";
import {
  DiscoverPopoverPage,
  DiscoverPopoverResult,
  DiscoverSortBy,
} from "../discover-popover/discover-popover.page";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonButton,
  IonIcon,
} from "@ionic/angular";
import { searchOutline, optionsOutline, closeOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

type DiscoverRecipeSummary =
  RouterOutputs["discover"]["searchDiscoverRecipes"]["recipes"][number];
type DiscoverRecipeAuthor = DiscoverRecipeSummary["author"];

const PAGE_SIZE = 40;
const TILE_WIDTH = 200;
const TILE_PADD = 20;
const MOBILE_TWO_COLUMN_MIN_WIDTH = 375;
const RESIZE_DEBOUNCE_MS = 150;

@Component({
  standalone: true,
  selector: "page-discover",
  templateUrl: "discover.page.html",
  styleUrls: ["discover.page.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    RatingComponent,
    UiScrollModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonButton,
    IonIcon,
  ],
})
export class DiscoverPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private navCtrl = inject(NavController);
  private popoverCtrl = inject(PopoverController);
  private translate = inject(TranslateService);
  private utilService = inject(UtilService);
  private loadingService = inject(LoadingService);
  private preferencesService = inject(PreferencesService);
  private serverActionsService = inject(ServerActionsService);
  private events = inject(EventService);
  private nativeTabBarService = inject(NativeTabBarService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  showBack = false;
  defaultBackHref: string = RouteMap.MorePage.getPath();

  languageOptions: DiscoverLanguageOption[] = [];

  searchTerm = "";
  readonly searchTermMaxLength = SEARCH_TERM_LENGTH_LIMIT;
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
  private searchGeneration = 0;
  private hasEntered = false;
  private categoriesParam: string | null = null;
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
    addIcons({ searchOutline, optionsOutline, closeOutline });
    this.languageOptions = getDiscoverLanguageOptions(
      this.utilService.getCurrentLocale(),
    );
    this.selectedLanguages = getDefaultDiscoverLanguages(
      this.utilService.getCurrentLocale(),
    );

    if (this.router.currentNavigation()?.extras.state?.showBack) {
      this.showBack = true;
    }
  }

  ionViewWillEnter() {
    const categoriesParam = this.route.snapshot.queryParamMap.get("categories");
    const categoriesParamChanged = categoriesParam !== this.categoriesParam;
    this.categoriesParam = categoriesParam;
    if (categoriesParamChanged && categoriesParam) {
      this.selectedCategories = categoriesParam
        .split(",")
        .map((category) => decodeURIComponent(category))
        .filter((category) => category.length > 0);
    }

    window.addEventListener("resize", this.onWindowResize);
    this.events.subscribe(
      [
        EventName.ApplicationSplitPaneChanged,
        EventName.ApplicationVerticalBarInsetChanged,
        EventName.ApplicationFontSizeChanged,
      ],
      this.updateLayout,
    );
    this.updateLayout();

    if (!this.hasEntered || categoriesParamChanged) {
      this.hasEntered = true;
      this.reload();
    }
  }

  ionViewWillLeave() {
    window.removeEventListener("resize", this.onWindowResize);
    this.events.unsubscribe(
      [
        EventName.ApplicationSplitPaneChanged,
        EventName.ApplicationVerticalBarInsetChanged,
        EventName.ApplicationFontSizeChanged,
      ],
      this.updateLayout,
    );
    clearTimeout(this.resizeTimeout);
  }

  private resizeTimeout: NodeJS.Timeout | undefined;
  private onWindowResize = () => {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(this.updateLayout, RESIZE_DEBOUNCE_MS);
  };

  private lastLayoutPageWidth?: number;
  private lastLayoutFontSize?: string;

  updateLayout = () => {
    const isSidebarEnabled =
      this.preferences[GlobalPreferenceKey.EnableSplitPane];
    const isSidebarOpen = window.innerWidth >= 1200;
    const sidebarWidth = isSidebarEnabled && isSidebarOpen ? 300 : 0;
    const pageWidth =
      window.innerWidth -
      sidebarWidth -
      this.nativeTabBarService.getHorizontalContentInset();
    const minimumColumnCount = pageWidth >= MOBILE_TWO_COLUMN_MIN_WIDTH ? 2 : 1;
    const tileColCount = Math.max(
      Math.floor(pageWidth / (TILE_WIDTH + TILE_PADD)),
      minimumColumnCount,
    );
    const fontSize = getComputedStyle(document.documentElement).fontSize;

    if (
      tileColCount === this.tileColCount &&
      pageWidth === this.lastLayoutPageWidth &&
      fontSize === this.lastLayoutFontSize
    ) {
      return;
    }

    const previousTileColCount = this.tileColCount;
    this.tileColCount = tileColCount;
    this.lastLayoutPageWidth = pageWidth;
    this.lastLayoutFontSize = fontSize;

    const firstVisibleIndex = this.datasource.adapter.firstVisible.$index ?? 0;
    const isTiled =
      this.preferences[MyRecipesPreferenceKey.ViewType] === "tiles";
    this.datasource.settings!.startIndex = isTiled
      ? Math.floor((firstVisibleIndex * previousTileColCount) / tileColCount)
      : firstVisibleIndex;
    this.datasource.adapter.reset();
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

  async openOptions(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: DiscoverPopoverPage,
      componentProps: {
        sortBy: this.sortBy,
      },
      event,
    });

    await popover.present();

    const { data } = await popover.onDidDismiss<DiscoverPopoverResult>();
    if (!data) return;

    this.sortBy = data.sortBy;
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
    if (data.refreshSearch) this.reload();
  }

  async reload() {
    const loading = this.loadingService.start();
    const generation = ++this.searchGeneration;
    this.recipes = [];
    this.reachedEnd = false;
    this.loadedAny = false;
    this.datasource.settings!.startIndex = 0;

    await this.fetchPage(0);

    if (generation === this.searchGeneration) {
      await this.datasource.adapter.reset();
    }

    loading.dismiss();
  }

  private async fetchUntil(target: number) {
    while (!this.reachedEnd && this.recipes.length < target) {
      const fetched = await this.fetchPage(this.recipes.length);
      if (!fetched) break;
    }
  }

  private async fetchPage(offset: number): Promise<boolean> {
    const generation = this.searchGeneration;
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
    if (generation !== this.searchGeneration) return false;

    for (let i = 0; i < response.recipes.length; i++) {
      this.recipes[offset + i] = response.recipes[i];
    }

    this.loadedAny = true;
    if (response.recipes.length < PAGE_SIZE) {
      this.reachedEnd = true;
    }

    return response.recipes.length > 0;
  }

  openRecipe(recipe: DiscoverRecipeSummary, event: MouseEvent) {
    this.utilService.navigateForwardOrOpenWindow(
      this.navCtrl,
      RouteMap.DiscoverRecipePage.getPath(recipe.id),
      event,
    );
  }
}
