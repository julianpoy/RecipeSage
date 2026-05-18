import { Component, inject, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";
import {
  NavController,
  AlertController,
  PopoverController,
} from "@ionic/angular/standalone";
import { Datasource, UiScrollModule } from "ngx-ui-scroll";

import { Recipe, RecipeFolderName } from "../../services/recipe.service";
import { LoadingService } from "../../services/loading.service";
import { WebsocketService } from "../../services/websocket.service";
import { EventName, EventService } from "../../services/event.service";
import { RouteMap, UtilService } from "../../services/util.service";

import { PreferencesService } from "../../services/preferences.service";
import {
  MyRecipesPreferenceKey,
  GlobalPreferenceKey,
  isRtlText,
} from "@recipesage/util/shared";
import { HomePopoverPage } from "../home-popover/home-popover.page";
import { HomeSearchFilterPopoverPage } from "../home-search-popover/home-search-filter-popover.page";
import { ServerActionsService } from "../../services/server-actions.service";
import type {
  LabelSummary,
  RecipeSummaryLite,
  UserPublic,
} from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { LogoIconComponent } from "../../components/logo-icon/logo-icon.component";
import { NullStateComponent } from "../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonBackButton,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonBadge,
  IonLabel,
  IonFab,
  IonFabButton,
  IonSpinner,
} from "@ionic/angular/standalone";
import {
  add,
  close,
  download,
  funnel,
  mailOpen,
  options,
  pricetag,
  search,
  trash,
} from "ionicons/icons";
import { addIcons } from "ionicons";

const TILE_WIDTH = 200;
const TILE_PADD = 20;

@Component({
  standalone: true,
  selector: "page-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    LogoIconComponent,
    NullStateComponent,
    UiScrollModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonBackButton,
    IonButton,
    IonIcon,
    IonTitle,
    IonContent,
    IonSearchbar,
    IonBadge,
    IonLabel,
    IonFab,
    IonFabButton,
    IonSpinner,
  ],
})
export class HomePage implements OnDestroy {
  private navCtrl = inject(NavController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private events = inject(EventService);
  private translate = inject(TranslateService);
  private popoverCtrl = inject(PopoverController);
  private loadingService = inject(LoadingService);
  private alertCtrl = inject(AlertController);
  private preferencesService = inject(PreferencesService);
  private websocketService = inject(WebsocketService);
  private serverActionsService = inject(ServerActionsService);
  private utilService = inject(UtilService);

  defaultBackHref: string = RouteMap.PeoplePage.getPath();
  aboutHref: string = RouteMap.AboutPage.getPath();
  showBack: boolean = false;

  labels: LabelSummary[] = [];
  selectedLabels: string[] = [];

  recipes: RecipeSummaryLite[] = [];
  recipeFetchBuffer = 100;
  fetchPerPage = 50;
  totalRecipeCount?: number;
  inFlightFetches = new Map<number, Promise<void>>();

  loading = true;
  selectedRecipeIds: string[] = [];
  selectionMode = false;

  searchText = "";

  folder: RecipeFolderName = "main";

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  reloadPending = true;
  recipeLoadGeneration = 0;

  userId?: string;

  private myProfileQuery = this.serverActionsService.users.getMe({
    401: () => {},
  });
  myProfile = this.myProfileQuery.value;
  friendsById?: {
    [key: string]: UserPublic;
  };
  otherUserProfile?: UserPublic;

  ratingFilter: (number | null)[] = [];

  tileColCount: number = 1;

  datasource = new Datasource<RecipeSummaryLite>({
    get: async (index: number, count: number) => {
      const isTiled =
        this.preferences[MyRecipesPreferenceKey.ViewType] === "tiles";
      if (isTiled) {
        index = index * this.tileColCount;
        count = count * this.tileColCount;
      }

      await this.fetchMoreRecipes(index + count);
      this.fetchMoreRecipes(index + count + this.recipeFetchBuffer).catch(
        () => {},
      );

      const recipes = this.recipes.slice(index, index + count);

      if (isTiled) {
        const recipeGroups = [];
        const groupCount = recipes.length / this.tileColCount;

        for (let i = 0; i < groupCount; i++) {
          const recipeIdx = i * this.tileColCount;
          recipeGroups.push(
            recipes.slice(recipeIdx, recipeIdx + this.tileColCount),
          );
        }

        return recipeGroups;
      }

      return recipes;
    },
    settings: {
      minIndex: 0,
      startIndex: 0,
      bufferSize: 5,
      padding: 0.5,
    },
  });

  constructor() {
    addIcons({
      add,
      close,
      download,
      funnel,
      mailOpen,
      options,
      pricetag,
      search,
      trash,
    });

    this.applyRouteParams();
    if (this.router.getCurrentNavigation()?.extras.state?.showBack) {
      this.showBack = true;
    }

    this.websocketService.on("messages:new", this.onWSEvent);
    this.events.subscribe(
      [
        EventName.RecipeCreated,
        EventName.RecipeUpdated,
        EventName.RecipeDeleted,
        EventName.LabelCreated,
        EventName.LabelUpdated,
        EventName.LabelDeleted,
      ],
      this.setReloadPending,
    );
    this.events.subscribe(
      EventName.ImportPepperplateComplete,
      this.onImportComplete,
    );
  }

  ngOnDestroy() {
    this.websocketService.off("messages:new", this.onWSEvent);
    this.events.unsubscribe(
      [
        EventName.RecipeCreated,
        EventName.RecipeUpdated,
        EventName.RecipeDeleted,
        EventName.LabelCreated,
        EventName.LabelUpdated,
        EventName.LabelDeleted,
      ],
      this.setReloadPending,
    );
    this.events.unsubscribe(
      EventName.ImportPepperplateComplete,
      this.onImportComplete,
    );
  }

  ionViewWillEnter() {
    window.addEventListener("resize", this.onWindowResize);
    this.events.subscribe(
      EventName.ApplicationSplitPaneChanged,
      this.updateTileColCount,
    );
    this.updateTileColCount();

    this.clearSelectedRecipes();

    const snapshotFolder =
      (this.route.snapshot.paramMap.get("folder") as RecipeFolderName) ||
      "main";
    const snapshotUserId =
      this.route.snapshot.queryParamMap.get("userId") || undefined;
    const snapshotLabels = (
      this.route.snapshot.queryParamMap.get("labels") || ""
    )
      .split(",")
      .filter((e) => e);

    const paramsChanged =
      snapshotFolder !== this.folder ||
      snapshotUserId !== this.userId ||
      snapshotLabels.join(",") !== this.selectedLabels.join(",");

    if (paramsChanged) {
      this.applyRouteParams();
      this.reloadPending = true;
    }

    if (this.reloadPending) {
      const loading = this.loadingService.start();
      this.resetAndLoadAll(true).finally(() => {
        loading.dismiss();
      });
    }

    this.fetchFriends();
  }

  ionViewWillLeave() {
    window.removeEventListener("resize", this.onWindowResize);
    this.events.unsubscribe(
      EventName.ApplicationSplitPaneChanged,
      this.updateTileColCount,
    );
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }
  }

  private resizeFrame: number | null = null;
  private onWindowResize = () => {
    if (this.resizeFrame !== null) return;
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.updateTileColCount();
    });
  };

  onWSEvent = (data: Record<string, string>) => {
    if (data.recipe && this.folder === "inbox") {
      this.resetAndLoadRecipes();
    }
  };

  onImportComplete = () => {
    this.resetAndLoadAllWithProgressIndicator(true);
  };

  resetAndLoadAllWithProgressIndicator(scrollToLastPosition?: boolean) {
    const loading = this.loadingService.start();
    this.resetAndLoadAll(scrollToLastPosition).finally(() => {
      loading.dismiss();
    });
  }

  setReloadPending = () => {
    this.reloadPending = true;
  };

  private applyRouteParams() {
    this.folder =
      (this.route.snapshot.paramMap.get("folder") as RecipeFolderName) ||
      "main";
    this.selectedLabels = (
      this.route.snapshot.queryParamMap.get("labels") || ""
    )
      .split(",")
      .filter((e) => e);
    this.userId = this.route.snapshot.queryParamMap.get("userId") || undefined;

    this.otherUserProfile = undefined;
    this.showBack = !!this.userId;
    this.defaultBackHref = RouteMap.PeoplePage.getPath();

    if (this.userId) {
      const expectedUserId = this.userId;
      this.serverActionsService.users
        .getUserProfilesById({
          ids: [expectedUserId],
        })
        .then((profileResponse) => {
          // Guard against stale pageload
          if (this.userId !== expectedUserId) return;

          const userProfile = profileResponse?.at(0);
          if (!userProfile) return;
          this.otherUserProfile = userProfile;
          this.defaultBackHref = RouteMap.ProfilePage.getPath(
            `@${userProfile.handle}`,
          );
        });
    }
  }

  updateTileColCount = () => {
    const isSidebarEnabled =
      this.preferences[GlobalPreferenceKey.EnableSplitPane];
    const isSidebarOpen = window.innerWidth >= 1200;
    const sidebarWidth = isSidebarEnabled && isSidebarOpen ? 300 : 0;
    const homePageWidth = window.innerWidth - sidebarWidth;
    const tileColCount = Math.max(
      Math.floor(homePageWidth / (TILE_WIDTH + TILE_PADD)),
      1,
    );

    if (tileColCount !== this.tileColCount) {
      this.tileColCount = tileColCount;

      // We set to zero since we don't know what the relative position would be now
      this.datasource.settings!.startIndex = 0;
      this.datasource.adapter.reset();
    }
  };

  async fetchMoreRecipes(target: number) {
    if (this.searchText) return;
    if (this.totalRecipeCount === undefined) return;

    const limit = Math.min(target, this.totalRecipeCount);
    const promises: Promise<void>[] = [];
    for (let offset = 0; offset < limit; offset += this.fetchPerPage) {
      if (this.recipes[offset] === undefined) {
        promises.push(this.loadRecipes(offset));
      }
    }

    await Promise.all(promises);
  }

  async resetAndLoadAll(
    scrollToLastPosition?: boolean,
  ): Promise<[void, void] | void> {
    this.reloadPending = false;

    // Load labels & recipes in parallel if user hasn't selected labels that need to be verified for existence
    // Or if we're loading someone elses collection (in which case we can't verify)
    if (this.selectedLabels.length === 0 || this.userId) {
      return Promise.all([
        this.resetAndLoadLabels(),
        this.resetAndLoadRecipes(scrollToLastPosition),
      ]);
    }

    return this.resetAndLoadLabels().then(() => {
      const labelNames = new Set(this.labels.map((e) => e.title));

      const previousLabels = this.selectedLabels;
      this.selectedLabels = this.selectedLabels.filter(
        (e) => labelNames.has(e) || e === "unlabeled",
      );
      if (this.selectedLabels.length !== previousLabels.length) {
        this.syncFiltersToUrl();
      }

      return this.resetAndLoadRecipes(scrollToLastPosition);
    });
  }

  resetAndLoadLabels() {
    this.labels = [];
    return this.loadLabels();
  }

  async resetAndLoadRecipes(scrollToLastPosition?: boolean) {
    const generation = ++this.recipeLoadGeneration;
    this.loading = true;
    this.resetRecipes();

    try {
      await this._resetAndLoadRecipes(scrollToLastPosition);
    } finally {
      if (this.recipeLoadGeneration === generation) {
        this.loading = false;
      }
    }
  }

  async _resetAndLoadRecipes(scrollToLastPosition?: boolean) {
    const generation = this.recipeLoadGeneration;

    if (this.searchText && this.searchText.trim().length > 0) {
      await this.search(this.searchText, generation);
    } else {
      await this.loadRecipes(0);
    }

    if (this.recipeLoadGeneration !== generation) return;

    const startIndex = scrollToLastPosition
      ? (this.datasource.adapter.firstVisible.$index ?? 0)
      : 0;
    this.datasource.settings!.startIndex = startIndex;
    await this.datasource.adapter.reset();
  }

  resetRecipes() {
    this.datasource.settings!.startIndex = 0;
    this.recipes = [];
    this.totalRecipeCount = undefined;
    this.inFlightFetches.clear();
  }

  isIncludeFriendsEnabled() {
    const includeAllFriends =
      !this.userId &&
      (this.preferences[MyRecipesPreferenceKey.IncludeFriends] === "yes" ||
        this.preferences[MyRecipesPreferenceKey.IncludeFriends] === "browse");

    return includeAllFriends;
  }

  loadRecipes(offset: number): Promise<void> {
    const existing = this.inFlightFetches.get(offset);
    if (existing) return existing;

    const promise = this.doLoadRecipes(offset).finally(() => {
      if (this.inFlightFetches.get(offset) === promise) {
        this.inFlightFetches.delete(offset);
      }
    });
    this.inFlightFetches.set(offset, promise);
    return promise;
  }

  async doLoadRecipes(offset: number) {
    const generation = this.recipeLoadGeneration;

    const sortPreference = this.preferences[MyRecipesPreferenceKey.SortBy];

    const result = await this.serverActionsService.recipes.getRecipes({
      folder: this.folder,
      orderBy: sortPreference.replace("-", "") as
        | "title"
        | "createdAt"
        | "updatedAt",
      orderDirection: sortPreference.startsWith("-") ? "desc" : "asc",
      offset,
      limit: this.fetchPerPage,
      labels: this.selectedLabels.length ? this.selectedLabels : undefined,
      labelIntersection:
        this.preferences[MyRecipesPreferenceKey.EnableLabelIntersection],
      includeAllFriends: this.isIncludeFriendsEnabled(),
      ratings: this.ratingFilter.length ? this.ratingFilter : undefined,
      userIds: this.userId ? [this.userId] : undefined,
    });

    if (this.recipeLoadGeneration !== generation) return;
    if (!result) throw new Error(`Failed to load recipes at offset ${offset}`);

    this.totalRecipeCount = result.totalCount;
    for (let i = 0; i < result.recipes.length; i++) {
      this.recipes[offset + i] = result.recipes[i];
    }
  }

  async loadLabels() {
    if (this.userId) {
      const response = await this.serverActionsService.labels.getLabelsByUserId(
        {
          userIds: [this.userId],
        },
        {
          401: () => {},
        },
      );
      if (!response) return;

      this.labels = response.sort((a, b) => a.title.localeCompare(b.title));
    } else if (this.isIncludeFriendsEnabled()) {
      const response =
        await this.serverActionsService.labels.getAllVisibleLabels({
          401: () => {},
        });
      if (!response) return;

      this.labels = response.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const response = await this.serverActionsService.labels.getLabels({
        401: () => {},
      });
      if (!response) return;

      this.labels = response.sort((a, b) => a.title.localeCompare(b.title));
    }
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

  toggleLabel(labelTitle: string) {
    const labelIdx = this.selectedLabels.indexOf(labelTitle);
    labelIdx > -1
      ? this.selectedLabels.splice(labelIdx, 1)
      : this.selectedLabels.push(labelTitle);
    this.syncFiltersToUrl();
    this.resetAndLoadRecipes();
  }

  private syncFiltersToUrl() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        labels: this.selectedLabels.length
          ? this.selectedLabels.join(",")
          : null,
      },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  openRecipe(recipe: Recipe, event?: MouseEvent | KeyboardEvent) {
    this.utilService.openRecipe(this.navCtrl, recipe.id, event);
  }

  async presentPopover(event: Event) {
    const popover = await this.popoverCtrl.create({
      component: HomePopoverPage,
      componentProps: {
        guestMode: !!this.userId,
        selectionMode: this.selectionMode,
      },
      event,
    });

    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;

      if (typeof data.selectionMode === "boolean") {
        this.selectionMode = data.selectionMode;
        if (!this.selectionMode) {
          this.clearSelectedRecipes();
        }
      }
      if (data.refreshSearch) this.resetAndLoadRecipes();
    });

    popover.present();
  }

  newRecipe() {
    this.navCtrl.navigateForward(RouteMap.EditRecipePage.getPath("new"));
  }

  searchFieldEnter(event: any) {
    this.search(event.target.value);
    event.target.blur();
  }

  async search(text: string, existingGeneration?: number) {
    if (text.trim().length === 0) {
      this.searchText = "";
      this.resetAndLoadRecipes();
      return;
    }

    const generation = existingGeneration ?? ++this.recipeLoadGeneration;
    const loading = this.loadingService.start();

    this.searchText = text;

    const includeAllFriends =
      !this.userId &&
      (this.preferences[MyRecipesPreferenceKey.IncludeFriends] === "yes" ||
        this.preferences[MyRecipesPreferenceKey.IncludeFriends] === "search");

    const result = await this.serverActionsService.recipes
      .searchRecipes({
        searchTerm: text,
        folder: this.folder,
        labels: this.selectedLabels.length ? this.selectedLabels : undefined,
        labelIntersection:
          this.preferences[MyRecipesPreferenceKey.EnableLabelIntersection],
        includeAllFriends,
        ratings: this.ratingFilter.length ? this.ratingFilter : undefined,
        userIds: this.userId ? [this.userId] : undefined,
      })
      .finally(loading.dismiss);

    if (!result) return;
    if (this.recipeLoadGeneration !== generation) return;

    this.resetRecipes();
    this.recipes = result.recipes;
    await this.datasource.adapter.reset();
  }

  selectRecipe(recipe: Recipe) {
    const index = this.selectedRecipeIds.indexOf(recipe.id);
    if (index > -1) {
      this.selectedRecipeIds.splice(index, 1);
    } else {
      this.selectedRecipeIds.push(recipe.id);
    }
  }

  clearSelectedRecipes() {
    this.selectionMode = false;
    this.selectedRecipeIds = [];
  }

  isRtlText(text: string, firstWordOnly = false): boolean {
    return isRtlText(text, firstWordOnly);
  }

  async addLabelToSelectedRecipes() {
    const header = await this.translate
      .get("pages.home.addLabel.header")
      .toPromise();
    const message = await this.translate
      .get("pages.home.addLabel.message")
      .toPromise();
    const placeholder = await this.translate
      .get("pages.home.addLabel.placeholder")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const save = await this.translate.get("generic.save").toPromise();

    const prompt = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          name: "labelName",
          placeholder,
        },
      ],
      buttons: [
        {
          text: cancel,
        },
        {
          text: save,
          handler: async ({ labelName }) => {
            const loading = this.loadingService.start();
            const response = await this.serverActionsService.labels.upsertLabel(
              {
                title: labelName.toLowerCase(),
                addToRecipeIds: this.selectedRecipeIds,
              },
            );
            if (!response) return loading.dismiss();
            await this.resetAndLoadAll();
            loading.dismiss();
          },
        },
      ],
    });
    prompt.present();
  }

  async exportSelectedRecipes() {
    const header = await this.translate
      .get("pages.home.exportSelected.header")
      .toPromise();
    const message = await this.translate
      .get("pages.home.exportSelected.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const pdfFormat = await this.translate
      .get("pages.home.exportSelected.pdf")
      .toPromise();
    const textFormat = await this.translate
      .get("pages.home.exportSelected.text")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: pdfFormat,
          handler: () => {
            this.startExport(this.selectedRecipeIds, "pdf");
          },
        },
        {
          text: textFormat,
          handler: () => {
            this.startExport(this.selectedRecipeIds, "txt");
          },
        },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  async startExport(recipeIds: string[], format: "txt" | "pdf" | "jsonld") {
    const result = await this.serverActionsService.jobs.startExportJob({
      format,
      recipeIds,
    });

    if (!result) return;

    const header = await this.translate
      .get("pages.home.exportSelected.processing.header")
      .toPromise();
    const message = await this.translate
      .get("pages.home.exportSelected.processing.message")
      .toPromise();
    const dismiss = await this.translate.get("generic.close").toPromise();
    const view = await this.translate
      .get("pages.home.exportSelected.processing.view")
      .toPromise();

    const processingAlert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: dismiss,
          role: "cancel",
        },
        {
          text: view,
          handler: async () => {
            this.navCtrl.navigateForward(RouteMap.ExportPage.getPath());
          },
        },
      ],
    });
    await processingAlert.present();
  }

  async deleteSelectedRecipes() {
    const recipeNames = this.selectedRecipeIds
      .map(
        (recipeId) =>
          this.recipes.find((recipe) => recipe?.id === recipeId)?.title,
      )
      .filter((title): title is string => !!title)
      .join(", ");

    const header = await this.translate
      .get("pages.home.deleteSelected.header")
      .toPromise();
    const message = await this.translate
      .get("pages.home.deleteSelected.message", { recipeNames })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
          handler: () => {},
        },
        {
          text: del,
          cssClass: "alertDanger",
          handler: async () => {
            const loading = this.loadingService.start();
            try {
              const response =
                await this.serverActionsService.recipes.deleteRecipesByIds({
                  ids: this.selectedRecipeIds,
                });
              if (!response) return;
              this.clearSelectedRecipes();
              await this.resetAndLoadAll();
            } finally {
              loading.dismiss();
            }
          },
        },
      ],
    });
    alert.present();
  }

  getCardClass(recipe: Recipe) {
    return {
      selected: this.selectedRecipeIds.includes(recipe.id),

      // The following should be generic to all recipes listed for height consistency
      showImage: this.preferences[this.preferenceKeys.ShowImages],
      showDescription:
        this.preferences[this.preferenceKeys.ShowRecipeDescription],
      showSource: this.preferences[this.preferenceKeys.ShowSource],
      showFromUser: this.folder === "inbox",
      showLabels: this.preferences[this.preferenceKeys.ShowLabels],
    };
  }

  getLabelList(recipe: RecipeSummaryLite) {
    return recipe.recipeLabels
      .map((recipeLabel) => recipeLabel.label.title)
      .join(", ");
  }

  getShouldShowLabelChips() {
    return (
      this.labels.length &&
      !this.userId &&
      this.preferences[this.preferenceKeys.ShowLabelChips] &&
      this.folder === "main"
    );
  }

  async showSearchFilter(event: Event) {
    const modal = await this.popoverCtrl.create({
      event,
      component: HomeSearchFilterPopoverPage,
      componentProps: {
        contextUserId: this.myProfile()?.id || null,
        guestMode: !!this.userId,
        labels: this.labels,
        selectedLabels: this.selectedLabels,
        ratingFilter: this.ratingFilter,
      },
    });

    await modal.present();
    const { data } = await modal.onDidDismiss();

    if (!data) return;

    if (data.selectedLabels) this.selectedLabels = data.selectedLabels;
    if (data.ratingFilter) this.ratingFilter = data.ratingFilter;
    this.syncFiltersToUrl();
    if (data.refreshSearch) this.resetAndLoadAll();
  }
}
