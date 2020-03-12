import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { RouteMap } from '@/services/util.service';
import { CookingToolbarService } from '@/services/cooking-toolbar.service';

@Component({
  selector: 'cooking-toolbar',
  templateUrl: 'cooking-toolbar.component.html',
  styleUrls: ['./cooking-toolbar.component.scss']
})
export class CookingToolbarComponent {
  constructor(
    private navCtrl: NavController,
    private cookingToolbarService: CookingToolbarService
  ) {}

  openRecipe(recipeId: string) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipeId));
  }
}
