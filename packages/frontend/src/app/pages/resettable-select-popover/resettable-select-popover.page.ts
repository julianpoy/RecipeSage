import { Component, Input, EventEmitter, Output } from "@angular/core";
import { PopoverController } from "@ionic/angular";

export interface ResettableSelectOption {
  title: string;
  value: string;
  selected: boolean;
}
export type ResettableSelectGroupedOptions = Record<
  string,
  ResettableSelectOption[]
>;

@Component({
  selector: "resettable-select-popover-page",
  templateUrl: "resettable-select-popover.page.html",
  styleUrls: ["resettable-select-popover.page.scss"],
})
export class ResettableSelectPopoverPage {
  resetToggled = false; // Stores current state of reset all checkbox

  @Input({
    required: true,
  })
  ungroupedOptions!: ResettableSelectOption[];

  @Input({
    required: false,
  })
  groupedOptions: ResettableSelectGroupedOptions = {};

  @Input({
    required: true,
  })
  nullMessage!: string;

  @Output() selectedValueChange = new EventEmitter();

  constructor(private popoverCtrl: PopoverController) {
    setTimeout(() => {
      console.log(this.ungroupedOptions, this.groupedOptions);
    }, 2000);
  }

  getSelectedValues() {
    const selectedValues = new Set<string>();

    for (const option of this.ungroupedOptions) {
      if (option.selected) {
        selectedValues.add(option.value);
      }
    }

    for (const optionGroup of Object.values(this.groupedOptions)) {
      for (const option of optionGroup) {
        if (option.selected) {
          selectedValues.add(option.value);
        }
      }
    }

    return [...selectedValues];
  }

  getGroupTitles() {
    return Object.keys(this.groupedOptions).sort((a, b) => a.localeCompare(b));
  }

  emitChange() {
    this.selectedValueChange.emit(this.getSelectedValues());
  }

  resetAll() {
    this.resetToggled = false;
    this.ungroupedOptions.forEach((option) => (option.selected = false));
    Object.values(this.groupedOptions).forEach((optionGroup) =>
      optionGroup.forEach((option) => (option.selected = false)),
    );
    this.emitChange();
  }

  close() {
    this.popoverCtrl.dismiss({
      selectedLabels: this.getSelectedValues(),
    });
  }
}
