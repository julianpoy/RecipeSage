import { Component, ViewChild, Input, inject } from "@angular/core";
import { IonSelect, PopoverController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { PreferencesService } from "../../services/preferences.service";
import { MyRecipesPreferenceKey } from "@recipesage/util/shared";
import {
  ResettableSelectGroupedOptions,
  ResettableSelectOption,
  ResettableSelectPopoverPage,
} from "../resettable-select-popover/resettable-select-popover.page";
import { RatingFilterPopoverComponent } from "../../components/rating-filter-popover/rating-filter-popover.component";
import { NutritionFilterPopoverComponent } from "../../components/nutrition-filter-popover/nutrition-filter-popover.component";
import type { LabelSummary, NutritionFilter } from "@recipesage/prisma";
import { countActiveNutritionRanges } from "../../utils/nutritionFilter";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonToggle,
  IonSelectOption,
} from "@ionic/angular/standalone";
import { caretDownSharp, funnel } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-home-search-filter-popover",
  templateUrl: "home-search-filter-popover.page.html",
  styleUrls: ["home-search-filter-popover.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonToggle,
    IonSelect,
    IonSelectOption,
  ],
})
export class HomeSearchFilterPopoverPage {
  constructor() {
    addIcons({ caretDownSharp, funnel });
  }

  private translate = inject(TranslateService);
  private popoverCtrl = inject(PopoverController);
  private preferencesService = inject(PreferencesService);

  @ViewChild("filterByLabelSelect", { static: true })
  filterByLabelSelect?: IonSelect;

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  @Input({
    required: true,
  })
  ratingFilter!: (number | null)[];

  @Input({
    required: true,
  })
  labels!: LabelSummary[];

  @Input({
    required: true,
  })
  selectedLabels!: string[];

  @Input({
    required: true,
  })
  guestMode!: boolean;

  @Input({
    required: true,
  })
  contextUserId!: string | null;

  @Input({
    required: true,
  })
  nutritionFilter!: NutritionFilter;

  savePreferences(refreshSearch?: boolean) {
    this.preferencesService.save();

    this.dismiss(refreshSearch);
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch,
      ratingFilter: this.ratingFilter,
      selectedLabels: this.selectedLabels,
      nutritionFilter: this.nutritionFilter,
    });
  }

  get nutritionFilterActiveCount(): number {
    return countActiveNutritionRanges(this.nutritionFilter);
  }

  async openLabelFilter() {
    const sharedLabelMessage = await this.translate
      .get("pages.homepopover.labelShared")
      .toPromise();
    const sharedCollectionMessage = await this.translate
      .get("pages.homepopover.labelSharedCollection")
      .toPromise();
    const nullMessage = await this.translate
      .get("pages.homepopover.labelNull")
      .toPromise();
    const ungroupedTitle = await this.translate
      .get("pages.recipeDetails.labels.uncatLabels")
      .toPromise();

    const groupCount = this.labels.filter((label) => label.labelGroupId).length;

    let hasSharedLabels = false;
    const ungroupedOptions: ResettableSelectOption[] = [];
    let groupedOptions = this.labels
      .sort((a, b) => a.title.localeCompare(b.title))
      .reduce((acc, label) => {
        if (this.contextUserId !== label.userId) {
          hasSharedLabels = true;
        }
        acc[label.labelGroup?.title || ungroupedTitle] ||= [];
        acc[label.labelGroup?.title || ungroupedTitle].push({
          title: `${label.title} (${this.contextUserId === label.userId ? label._count.recipeLabels : sharedLabelMessage})`,
          value: label.title,
          selected: this.selectedLabels.indexOf(label.title) > -1,
        });

        return acc;
      }, {} as ResettableSelectGroupedOptions);

    const unlabeledTitle = await this.translate
      .get("pages.homepopover.unlabeled")
      .toPromise();
    // Do not add unlabeled option if no labels are present
    if (Object.keys(groupedOptions).length)
      ungroupedOptions.unshift({
        title: unlabeledTitle,
        value: "unlabeled",
        selected: this.selectedLabels.indexOf("unlabeled") > -1,
      });

    // If we have no groups to display, do not show the "ungrouped" labels as their own section, instead everything is ungrouped now
    if (!groupCount && Object.values(groupedOptions).length === 1) {
      ungroupedOptions.push(...Object.values(groupedOptions)[0]);
      groupedOptions = {};
    }

    const labelFilterPopover = await this.popoverCtrl.create({
      component: ResettableSelectPopoverPage,
      componentProps: {
        message: hasSharedLabels ? sharedCollectionMessage : undefined,
        ungroupedOptions,
        groupedOptions,
        nullMessage,
      },
    });
    labelFilterPopover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      const unlabeledOnly = data.selectedLabels?.includes("unlabeled");

      if (unlabeledOnly) {
        this.selectedLabels.splice(0, this.selectedLabels.length, "unlabeled");
      } else {
        this.selectedLabels.splice(
          0,
          this.selectedLabels.length,
          ...data.selectedLabels,
        );
      }

      setTimeout(() => {
        this.dismiss(true);
      });
    });
    labelFilterPopover.present();
  }

  async openRatingFilter() {
    const ratingFilterPopover = await this.popoverCtrl.create({
      component: RatingFilterPopoverComponent,
      componentProps: {
        ratingFilter: this.ratingFilter,
      },
    });

    await ratingFilterPopover.present();

    const { data } = await ratingFilterPopover.onDidDismiss();
    if (!data) return;

    this.ratingFilter = data.ratingFilter;

    setTimeout(() => {
      this.dismiss(true);
    });
  }

  async openNutritionFilter() {
    const nutritionFilterPopover = await this.popoverCtrl.create({
      component: NutritionFilterPopoverComponent,
      cssClass: "nutritionFilterPopover",
      componentProps: {
        nutritionFilter: this.nutritionFilter,
      },
    });

    await nutritionFilterPopover.present();

    const { data } = await nutritionFilterPopover.onDidDismiss();
    if (!data) return;

    this.nutritionFilter = data.nutritionFilter;

    setTimeout(() => {
      this.dismiss(true);
    });
  }
}
