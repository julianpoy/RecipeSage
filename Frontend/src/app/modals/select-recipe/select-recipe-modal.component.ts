import {Recipe} from '@/services/recipe.service';
import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'select-recipe-modal',
  templateUrl: 'select-recipe-modal.component.html',
  styleUrls: ['./select-recipe-modal.component.scss']
})
export class SelectRecipeModalComponent {

  recipe: Recipe;

  @Input() selectedRecipe: Recipe;

  constructor(
    private modalCtrl: ModalController
  ) {}

  done() {
    this.modalCtrl.dismiss({
      recipe: this.recipe
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }
}
