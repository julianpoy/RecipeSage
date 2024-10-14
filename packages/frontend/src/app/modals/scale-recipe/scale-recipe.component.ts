import { Component, Input } from "@angular/core";
import { ModalController } from "@ionic/angular";
import fractionjs from "fraction.js";

@Component({
  selector: "scale-recipe",
  templateUrl: "scale-recipe.component.html",
  styleUrls: ["scale-recipe.component.scss"],
})
export class ScaleRecipeComponent {
  @Input() scale: string = "1";

  constructor(private modalCtrl: ModalController) {}

  format(input: string) {
    // Support fractions
    const parsed = fractionjs(input).valueOf();

    // Trim long/repeating decimals
    let rounded = Number(parsed.toFixed(3));

    // Check for falsy values
    if (!rounded || rounded <= 0) rounded = 1;

    return rounded;
  }

  close() {
    this.modalCtrl.dismiss();
  }

  apply() {
    this.modalCtrl.dismiss({
      scale: this.format(this.scale),
    });
  }
}
