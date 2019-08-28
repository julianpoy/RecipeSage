import { Component, ViewChild, Input } from '@angular/core';
import { ToastController, ModalController, IonSelect, PopoverController } from '@ionic/angular';

import { LabelService } from '@/services/label.service';
import { UtilService } from '@/services/util.service';
import { ResettableSelectPopoverPage } from '@/pages/resettable-select-popover/resettable-select-popover.page';

@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.page.html',
  styleUrls: ['home-popover.page.scss']
})
export class HomePopoverPage {

  @ViewChild('filterByLabelSelect', { static: true }) filterByLabelSelect: IonSelect;

  @Input() viewOptions: any;

  @Input() labels: any;

  constructor(
    public popoverCtrl: PopoverController,
    public toastCtrl: ToastController,
    public utilService: UtilService,
    public labelService: LabelService) {

  }

  saveViewOptions(refreshSearch?: boolean) {
    localStorage.setItem('enableLabelIntersection', this.viewOptions.enableLabelIntersection);
    localStorage.setItem('showLabels', this.viewOptions.showLabels);
    localStorage.setItem('showLabelChips', this.viewOptions.showLabelChips);
    localStorage.setItem('showImages', this.viewOptions.showImages);
    localStorage.setItem('showSource', this.viewOptions.showSource);
    localStorage.setItem('sortBy', this.viewOptions.sortBy);
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
          selected: this.viewOptions.selectedLabels.indexOf(label.title) > -1
        }))
      }
    });
    labelFilterPopover.onDidDismiss().then(({ data }) => {
      if (!data) return;
      this.viewOptions.selectedLabels.splice(0, this.viewOptions.selectedLabels.length, ...data.selectedLabels);
      this.saveViewOptions(true);
    });
    labelFilterPopover.present();
  }
}
