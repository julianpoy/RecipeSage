import { Component, Input, EventEmitter, Output } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import fractionjs from 'fraction.js';

@Component({
  selector: 'scale-recipe',
  templateUrl: 'scale-recipe.component.html',
  styleUrls: ['scale-recipe.component.scss']
})
export class ScaleRecipeComponent {
  scale: string;

  constructor(private popoverCtrl: PopoverController) {}

  format(input) {
    // Support fractions
    const parsed = fractionjs(input).valueOf();

    // Trim long/repeating decimals
    let rounded = Number(parsed.toFixed(3));

    // Check for falsy values
    if (!rounded || rounded <= 0) rounded = 1;

    return rounded;
  }

  close() {
    this.popoverCtrl.dismiss();
  }

  apply() {
    this.popoverCtrl.dismiss({
      scale: this.format(this.scale),
    });
  }
}
