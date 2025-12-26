import { Component, Input, Output, EventEmitter } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "rating",
  templateUrl: "rating.component.html",
  styleUrls: ["./rating.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class RatingComponent {
  @Output() ratingChanged = new EventEmitter<number>();

  _rating: number = 0;

  @Input()
  set rating(rating: number | undefined) {
    this._rating = rating || 0;
    this.updateRatingVisual();
  }
  get rating() {
    return this._rating;
  }

  @Input() enableEdit: boolean = false;

  ratingVisual = new Array<string>(5).fill("star-outline");

  constructor() {}

  updateRatingVisual() {
    this.ratingVisual = new Array<string>(5)
      .fill("star", 0, this.rating)
      .fill("star-outline", this.rating, 5);
  }

  setRating(rating: number) {
    if (!this.enableEdit) return;

    if (rating === this.rating) rating = 0;

    this.ratingChanged.emit(rating);
  }
}
