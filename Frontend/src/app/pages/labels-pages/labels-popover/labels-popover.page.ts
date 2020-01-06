import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { UtilService } from '@/services/util.service';
import { QuickTutorialService, QuickTutorialOptions } from '@/services/quick-tutorial.service';

@Component({
  selector: 'page-labels-popover',
  templateUrl: 'labels-popover.page.html',
  styleUrls: ['labels-popover.page.scss']
})
export class LabelsPopoverPage {

  @Input() viewOptions: any;

  @Input() labels: any;

  @Input() selectionMode: boolean;

  constructor(
    public popoverCtrl: PopoverController,
    public utilService: UtilService,
    public quickTutorialService: QuickTutorialService) {

  }

  toggleSelectionMode() {
    const enteringSelectionMode = !this.selectionMode;
    if (enteringSelectionMode) {
      this.quickTutorialService.triggerQuickTutorial(QuickTutorialOptions.MultipleLabelSelection);
    }

    this.popoverCtrl.dismiss({
      selectionMode: enteringSelectionMode
    });
  }

  saveViewOptions(refreshSearch?: boolean) {
    localStorage.setItem('showDates', this.viewOptions.showDates);
    this.popoverCtrl.dismiss({
      refreshSearch
    });
  }
}
