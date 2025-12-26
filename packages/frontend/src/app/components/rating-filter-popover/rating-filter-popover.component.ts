import { Component, Input, inject } from "@angular/core";
import { PopoverController } from "@ionic/angular";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { RatingComponent } from "../rating/rating.component";

@Component({
  standalone: true,
  selector: "rating-filter-popover",
  templateUrl: "rating-filter-popover.component.html",
  styleUrls: ["./rating-filter-popover.component.scss"],
  imports: [...SHARED_UI_IMPORTS, RatingComponent],
})
export class RatingFilterPopoverComponent {
  private popoverCtrl = inject(PopoverController);

  possibleRatings: number[] = [1, 2, 3, 4, 5];

  _ratingFilter: (number | null)[] = [];
  @Input()
  set ratingFilter(filter: (number | null)[]) {
    this._ratingFilter = [...filter];
  }
  get ratingFilter() {
    return this._ratingFilter;
  }

  reset() {
    this.ratingFilter.splice(0);

    this.close();
  }

  toggle(rating: number | null) {
    const idx = this.ratingFilter.indexOf(rating);
    if (idx > -1) this.ratingFilter.splice(idx, 1);
    else this.ratingFilter.push(rating);
  }

  close() {
    this.popoverCtrl.dismiss({
      ratingFilter: [...this.ratingFilter],
    });
  }
}
