import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap, AuthType } from '@/services/util.service';

@Component({
  selector: 'page-add-profile-item-modal',
  templateUrl: 'add-profile-item-modal.page.html',
  styleUrls: ['add-profile-item-modal.page.scss']
})
export class AddProfileItemModalPage {

  itemType = null;

  itemVisibility = null;
  visibilityTypePrettyNameMap = {
    public: 'public',
    'friends-only': 'friends only',
  };

  itemTitle = '';

  selectedRecipe;
  selectedLabel;

  constructor(
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private utilService: UtilService,
    private loadingService: LoadingService,
    private userService: UserService,
    private modalCtrl: ModalController
  ) {}

  cancel() {
    this.modalCtrl.dismiss();
  }

  done() {
    const { itemType, itemVisibility, itemTitle, selectedRecipe, selectedLabel } = this;

    this.modalCtrl.dismiss({
      item: {
        title: itemTitle,
        type: itemType,
        visibility: itemVisibility,
        label: selectedLabel || null,
        recipe: selectedRecipe || null,
      }
    });
  }

  isValid() {
    return this.itemTitle && this.itemVisibility && this.isItemSelected();
  }

  isItemSelected() {
    return this.itemType && (
      this.itemType === 'all-recipes'
      || this.selectedRecipe
      || this.selectedLabel
    );
  }
}
