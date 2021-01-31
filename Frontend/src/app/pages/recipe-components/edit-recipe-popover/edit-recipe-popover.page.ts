import { Component, Input } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { PreferencesService, RecipeDetailsPreferenceKey } from '@/services/preferences.service';

@Component({
  selector: 'page-edit-recipe-popover',
  templateUrl: 'edit-recipe-popover.page.html',
  styleUrls: ['edit-recipe-popover.page.scss']
})
export class EditRecipePopoverPage {
  preferences = this.preferencesService.preferences;
  preferenceKeys = RecipeDetailsPreferenceKey;

  canAddImages;
  addImageByUrlPrompt;

  constructor(
    private preferencesService: PreferencesService,
    private popoverCtrl: PopoverController
  ) {}

  savePreferences() {
    this.preferencesService.save();
  }

  dismiss() {
    this.popoverCtrl.dismiss();
  }
}
