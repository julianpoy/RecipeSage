import { Component, ViewChild, Input } from '@angular/core';
import { ToastController, ModalController, IonSelect } from '@ionic/angular';

import { LabelService } from '@/services/label.service';
import { UtilService } from '@/services/util.service';

@Component({
  selector: 'page-home-popover',
  templateUrl: 'home-popover.page.html',
  styleUrls: ['home-popover.page.scss']
})
export class HomePopoverPage {

  @ViewChild('filterByLabelSelect') filterByLabelSelect: IonSelect;

  @Input() viewOptions: any;

  @Input() labels: any;

  constructor(
    public modalCtrl: ModalController,
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
    this.modalCtrl.dismiss({
      refreshSearch
    });
  }

  resetFilterByLabel() {
    // this.filterByLabelSelect.dismiss();
    this.viewOptions.selectedLabels.splice(0, this.viewOptions.selectedLabels.length)
    this.saveViewOptions(true)
  }
}
