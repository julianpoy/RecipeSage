import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonIcon } from "@ionic/angular";
import { star, starOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "rating",
  templateUrl: "rating.component.html",
  styleUrls: ["./rating.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonIcon],
})
export class RatingComponent {
  @Output() ratingChanged = new EventEmitter<number>();

  _rating: number = 0;

  @Input()
  set rating(rating: number | null | undefined) {
    this._rating = rating || 0;
    this.updateRatingVisual();
  }
  get rating() {
    return this._rating;
  }

  @Input() enableEdit: boolean = false;

  ratingVisual = new Array<string>(5).fill("star-outline");

  get filledStarCount() {
    return this.ratingVisual.filter((star) => star === "star").length;
  }

  constructor() {
    addIcons({ star, starOutline });
  }

  updateRatingVisual() {
    this.ratingVisual = new Array<string>(5)
      .fill("star", 0, this.rating ?? undefined)
      .fill("star-outline", this.rating ?? undefined, 5);
  }

  setRating(rating: number) {
    if (!this.enableEdit) return;

    if (rating === this.rating) rating = 0;

    this.ratingChanged.emit(rating);
  }
}
