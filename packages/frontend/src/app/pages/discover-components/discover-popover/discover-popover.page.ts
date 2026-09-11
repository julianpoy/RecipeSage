import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular/standalone";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
} from "@ionic/angular/standalone";

export type DiscoverSortBy = "trending" | "newest" | "topRated" | "mostSaved";

export interface DiscoverPopoverResult {
  sortBy: DiscoverSortBy;
}

@Component({
  standalone: true,
  selector: "page-discover-popover",
  templateUrl: "discover-popover.page.html",
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonSelect,
    IonSelectOption,
  ],
})
export class DiscoverPopoverPage {
  private popoverCtrl = inject(PopoverController);

  @Input() sortBy: DiscoverSortBy = "trending";

  onSortByChange() {
    this.popoverCtrl.dismiss({
      sortBy: this.sortBy,
    } satisfies DiscoverPopoverResult);
  }
}
