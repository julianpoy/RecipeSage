import {
  Component,
  EventEmitter,
  Input,
  Output,
  ChangeDetectionStrategy,
} from "@angular/core";
import { IonBadge } from "@ionic/angular/standalone";
import type { RecipeSummaryLite } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { RatingComponent } from "../rating/rating.component";

@Component({
  standalone: true,
  selector: "recipe-list-item",
  templateUrl: "./recipe-list-item.component.html",
  styleUrls: ["./recipe-list-item.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonBadge, RatingComponent],
})
export class RecipeListItemComponent {
  @Input({ required: true }) recipe!: RecipeSummaryLite;
  @Input() viewType: "list" | "compact" = "list";
  @Input() showImage = true;
  @Input() showDescription = true;
  @Input() showSource = true;
  @Input() showFromUser = false;
  @Input() showLabels = true;
  @Input() showRating = false;
  @Input() selected = false;
  @Input() badgeHandle?: string;
  @Input() fromSharedCollection = false;

  @Output() recipeClick = new EventEmitter<MouseEvent | KeyboardEvent>();

  onActivate(event: Event) {
    if (event instanceof KeyboardEvent) event.preventDefault();
    if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
      this.recipeClick.emit(event);
    }
  }
}
