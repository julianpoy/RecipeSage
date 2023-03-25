import { Component, ViewChild, Input } from '@angular/core';
import { ToastController, ModalController, IonSelect, PopoverController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { LabelService } from '~/services/label.service';
import { UtilService } from '~/services/util.service';
import { QuickTutorialService, QuickTutorialOptions } from '~/services/quick-tutorial.service';
import { PreferencesService, MyRecipesPreferenceKey } from '~/services/preferences.service';
import { ResettableSelectPopoverPage } from '~/pages/resettable-select-popover/resettable-select-popover.page';
import {RatingFilterPopoverComponent} from '~/components/rating-filter-popover/rating-filter-popover.component';

@Component({
  selector: 'page-home-search-filter-popover',
  templateUrl: 'home-search-filter-popover.page.html',
  styleUrls: ['home-search-filter-popover.page.scss']
})
export class HomeSearchFilterPopoverPage {

  @ViewChild('filterByLabelSelect', { static: true }) filterByLabelSelect: IonSelect;

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  @Input() ratingFilter: (number|null)[];

  @Input() labels: any;

  @Input() selectedLabels: any[];

  @Input() guestMode: boolean;

  constructor(
    public translate: TranslateService,
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public quickTutorialService: QuickTutorialService,
    public labelService: LabelService) {

  }

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
    const nullMessage = await this.translate.get('pages.homepopover.labelNull').toPromise();

    const options = this.labels.map(label => ({
      title: `${label.title} (${label.recipeCount})`,
      value: label.title,
      selected: this.selectedLabels.indexOf(label.title) > -1
    }));

    const unlabeledTitle = await this.translate.get('pages.homepopover.unlabeled').toPromise();
    // Do not add unlabeled option if no labels are present
    if (options.length) options.unshift({
      title: unlabeledTitle,
      value: 'unlabeled',
      selected: this.selectedLabels.indexOf('unlabeled') > -1
    });

    const labelFilterPopover = await this.popoverCtrl.create({
      component: ResettableSelectPopoverPage,
      componentProps: {
        options,
        nullMessage
      }
    });
    labelFilterPopover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      const unlabeledOnly = data.selectedLabels?.includes('unlabeled');

      if (unlabeledOnly) {
        this.selectedLabels.splice(0, this.selectedLabels.length, 'unlabeled');
      } else {
        this.selectedLabels.splice(0, this.selectedLabels.length, ...data.selectedLabels);
      }

      setTimeout(() => {
        this.dismiss(true);
      })
    });
    labelFilterPopover.present();
  }

  async openRatingFilter() {
    const ratingFilterPopover = await this.popoverCtrl.create({
      component: RatingFilterPopoverComponent,
      componentProps: {
        ratingFilter: this.ratingFilter,
      }
    });

    await ratingFilterPopover.present();

    const { data } = await ratingFilterPopover.onDidDismiss();
    if (!data) return;

    this.ratingFilter = data.ratingFilter;
    console.log("isafter", this.ratingFilter.join(','));

    setTimeout(() => {
      this.dismiss(true);
    });
  }
}
