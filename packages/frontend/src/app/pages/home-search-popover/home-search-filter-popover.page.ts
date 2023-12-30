import { Component, ViewChild, Input } from "@angular/core";
import { ToastController, IonSelect, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { Label, LabelService } from "~/services/label.service";
import { UtilService } from "~/services/util.service";
import { QuickTutorialService } from "~/services/quick-tutorial.service";
import { PreferencesService } from "~/services/preferences.service";
import { MyRecipesPreferenceKey } from "@recipesage/util";
import {
  ResettableSelectGroupedOptions,
  ResettableSelectOption,
  ResettableSelectPopoverPage,
} from "~/pages/resettable-select-popover/resettable-select-popover.page";
import { RatingFilterPopoverComponent } from "~/components/rating-filter-popover/rating-filter-popover.component";
import type { LabelSummary } from "@recipesage/trpc";

@Component({
  selector: "page-home-search-filter-popover",
  templateUrl: "home-search-filter-popover.page.html",
  styleUrls: ["home-search-filter-popover.page.scss"],
})
export class HomeSearchFilterPopoverPage {
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

  constructor(
    public translate: TranslateService,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public quickTutorialService: QuickTutorialService,
    public labelService: LabelService,
  ) {}

  savePreferences(refreshSearch?: boolean) {
    this.preferencesService.save();

    this.dismiss(refreshSearch);
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch,
      ratingFilter: this.ratingFilter,
    });
  }

  async openLabelFilter() {
    const nullMessage = await this.translate
      .get("pages.homepopover.labelNull")
      .toPromise();
    const ungroupedTitle = await this.translate
      .get("pages.recipeDetails.labels.uncatLabels")
      .toPromise();

    const groupCount = this.labels.filter((label) => label.labelGroupId).length;

    const ungroupedOptions: ResettableSelectOption[] = [];
    let groupedOptions = this.labels
      .sort((a, b) => a.title.localeCompare(b.title))
      .reduce((acc, label) => {
        acc[label.labelGroup?.title || ungroupedTitle] ||= [];
        acc[label.labelGroup?.title || ungroupedTitle].push({
          title: `${label.title} (${label.recipeLabels.length})`,
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
}
