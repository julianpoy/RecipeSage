import { Component } from '@angular/core';
import { AlertController, NavController } from '@ionic/angular';

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
    private alertCtrl: AlertController,
    public cookingToolbarService: CookingToolbarService
  ) {}

  openRecipe(recipeId: string) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipeId));
  }

  async clearPins() {
    const alert = await this.alertCtrl.create({
      header: 'Clear All Pinned Recipes?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: () => {
            this.cookingToolbarService.clearPins();
          }
        }
      ]
    });
    alert.present();
  }
}
