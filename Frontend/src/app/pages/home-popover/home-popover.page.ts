import { Component, ViewChild, Input } from '@angular/core';
import { ToastController, ModalController, IonSelect, PopoverController } from '@ionic/angular';

import { LabelService } from '@/services/label.service';
import { UtilService } from '@/services/util.service';
import { QuickTutorialService, QuickTutorialOptions } from '@/services/quick-tutorial.service';
import { PreferencesService, MyRecipesPreferenceKey } from '@/services/preferences.service';
import { ResettableSelectPopoverPage } from '@/pages/resettable-select-popover/resettable-select-popover.page';

@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.page.html',
  styleUrls: ['home-popover.page.scss']
})
export class HomePopoverPage {

  @ViewChild('filterByLabelSelect', { static: true }) filterByLabelSelect: IonSelect;

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  @Input() labels: any;

  @Input() selectedLabels: any[];

  @Input() selectionMode: boolean;

  constructor(
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,
    public utilService: UtilService,
    public preferencesService: PreferencesService,
    public quickTutorialService: QuickTutorialService,
    public labelService: LabelService) {

  }

  toggleSelectionMode() {
    const enteringSelectionMode = !this.selectionMode;
    if (enteringSelectionMode) {
      this.quickTutorialService.triggerQuickTutorial(QuickTutorialOptions.MultipleRecipeSelection);
    }

    this.popoverCtrl.dismiss({
      selectionMode: enteringSelectionMode
    });
  }

  savePreferences(refreshSearch?: boolean) {
    this.preferencesService.save();

    this.dismiss(refreshSearch);
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch
    });
  }

  async openLabelFilter() {
    const labelFilterPopover = await this.popoverCtrl.create({
      component: ResettableSelectPopoverPage,
      componentProps: {
        options: this.labels.map(label => ({
          title: `${label.title} (${label.recipeCount})`,
          value: label.title,
          selected: this.selectedLabels.indexOf(label.title) > -1
        })),
        nullMessage: "You don't have any labels. You can create labels on the recipe details page."
      }
    });
    labelFilterPopover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      this.selectedLabels.splice(0, this.selectedLabels.length, ...data.selectedLabels);
      this.dismiss(true);
    });
    labelFilterPopover.present();
  }
}
