import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'rating-filter-popover',
  templateUrl: 'rating-filter-popover.component.html',
  styleUrls: ['./rating-filter-popover.component.scss']
})
export class RatingFilterPopoverComponent {

  possibleRatings: number[] = [1,2,3,4,5];

  _ratingFilter: (number|null)[] = [];
  @Input()
  set ratingFilter(filter: (number|null)[]) {
    this._ratingFilter = [...filter];
  }
  get ratingFilter() {
    return this._ratingFilter;
  }

  constructor(private popoverCtrl: PopoverController) {}

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
      ratingFilter: [...this.ratingFilter]
    });
  }
}
