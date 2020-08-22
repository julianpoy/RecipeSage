import { Component, Input, EventEmitter, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';

interface Option {
  title: string,
  value: string,
  selected: boolean
}

@Component({
  selector: 'resettable-select-popover-page',
  templateUrl: 'resettable-select-popover.page.html',
  styleUrls: ['resettable-select-popover.page.scss']
})
export class ResettableSelectPopoverPage {

  resetToggled = false; // Stores current state of reset all checkbox

  @Input() options: Option[];

  @Input() nullMessage: string;

  @Output() selectedValueChange = new EventEmitter();

  constructor(private popoverCtrl: PopoverController) {}

  getSelectedValues() {
    return this.options.filter(option => option.selected).map(option => option.value);
  }

  emitChange() {
    this.selectedValueChange.emit(this.getSelectedValues());
  }

  resetAll() {
    this.resetToggled = false;
    this.options.forEach(option => option.selected = false);
    this.emitChange();
  }

  close() {
    this.popoverCtrl.dismiss({
      selectedLabels: this.getSelectedValues()
    });
  }
}
