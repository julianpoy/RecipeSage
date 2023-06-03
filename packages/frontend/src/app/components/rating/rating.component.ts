import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "rating",
  templateUrl: "rating.component.html",
  styleUrls: ["./rating.component.scss"],
})
export class RatingComponent {
  @Output() ratingChanged = new EventEmitter<number>();

  _rating: number = 0;

  @Input()
  set rating(rating: number) {
    this._rating = rating;
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
