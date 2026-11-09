import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {
  type IngredientTextPart,
  splitIngredientTextParts,
} from "@recipesage/util/shared";

@Component({
  standalone: true,
  selector: "ingredient-text",
  templateUrl: "ingredient-text.component.html",
  styleUrls: ["./ingredient-text.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class IngredientTextComponent {
  parts: IngredientTextPart[] = [];

  @Input({
    required: true,
  })
  set text(val: string) {
    this.parts = splitIngredientTextParts(val);
  }
}
