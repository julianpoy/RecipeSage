import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import {
  DISCOVER_CATEGORIES,
  DISCOVER_CATEGORY_LABEL_KEYS,
  DISCOVER_CATEGORY_GROUP_LABEL_KEYS,
} from "@recipesage/util/shared";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { DiscoverLanguageOption } from "../../../utils/discoverLanguages";
import {
  ResettableSelectOption,
  ResettableSelectGroupedOptions,
  ResettableSelectPopoverPage,
} from "../../resettable-select-popover/resettable-select-popover.page";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from "@ionic/angular/standalone";
import { caretDownSharp } from "ionicons/icons";
import { addIcons } from "ionicons";

export type DiscoverSortBy = "trending" | "newest" | "topRated" | "mostSaved";
export type DiscoverPhotoFilter = "optional" | "required" | "none";

export interface DiscoverFilterResult {
  refreshSearch?: boolean;
  languages: string[];
  categories: string[];
  matchAllCategories: boolean;
  minRating: number;
  minRatingCount: number;
  photo: DiscoverPhotoFilter;
  sortBy: DiscoverSortBy;
}

@Component({
  standalone: true,
  selector: "page-discover-filter-popover",
  templateUrl: "discover-filter-popover.page.html",
  styleUrls: ["discover-filter-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonToggle,
  ],
})
export class DiscoverFilterPopoverPage {
  private translate = inject(TranslateService);
  private popoverCtrl = inject(PopoverController);

  @Input() languageOptions: DiscoverLanguageOption[] = [];
  @Input() selectedLanguages: string[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() matchAllCategories = false;
  @Input() minRating = 0;
  @Input() minRatingCount = 0;
  @Input() photo: DiscoverPhotoFilter = "optional";
  @Input() sortBy: DiscoverSortBy = "trending";

  constructor() {
    addIcons({ caretDownSharp });
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch,
      languages: this.selectedLanguages,
      categories: this.selectedCategories,
      matchAllCategories: this.matchAllCategories,
      minRating: this.minRating,
      minRatingCount: this.minRatingCount,
      photo: this.photo,
      sortBy: this.sortBy,
    } satisfies DiscoverFilterResult);
  }

  onFilterChange() {
    this.dismiss(true);
  }

  async openLanguageFilter() {
    const nullMessage = await this.translate
      .get("pages.discover.filters.language.all")
      .toPromise();

    const ungroupedOptions: ResettableSelectOption[] = this.languageOptions.map(
      (option) => ({
        title: option.label,
        value: option.code,
        selected: this.selectedLanguages.includes(option.code),
      }),
    );

    const popover = await this.popoverCtrl.create({
      component: ResettableSelectPopoverPage,
      componentProps: {
        ungroupedOptions,
        nullMessage,
      },
    });
    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      this.selectedLanguages.splice(
        0,
        this.selectedLanguages.length,
        ...data.selectedLabels,
      );
      setTimeout(() => {
        this.dismiss(true);
      });
    });
    popover.present();
  }

  async openCategoryFilter() {
    const nullMessage = await this.translate
      .get("pages.discover.filters.categories.all")
      .toPromise();

    const groupedOptions: ResettableSelectGroupedOptions = {};
    for (const category of DISCOVER_CATEGORIES) {
      const groupTitle = this.translate.instant(
        DISCOVER_CATEGORY_GROUP_LABEL_KEYS[category.group],
      );
      if (!groupedOptions[groupTitle]) {
        groupedOptions[groupTitle] = [];
      }
      groupedOptions[groupTitle].push({
        title: this.translate.instant(
          DISCOVER_CATEGORY_LABEL_KEYS[category.key],
        ),
        value: category.key,
        selected: this.selectedCategories.includes(category.key),
      });
    }

    const popover = await this.popoverCtrl.create({
      component: ResettableSelectPopoverPage,
      componentProps: {
        ungroupedOptions: [],
        groupedOptions,
        nullMessage,
      },
    });
    popover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      this.selectedCategories.splice(
        0,
        this.selectedCategories.length,
        ...data.selectedLabels,
      );
      setTimeout(() => {
        this.dismiss(true);
      });
    });
    popover.present();
  }
}
