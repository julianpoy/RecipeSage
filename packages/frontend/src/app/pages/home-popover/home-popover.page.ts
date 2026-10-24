import {
  Component,
  Input,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { ToastController, PopoverController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UtilService } from "../../services/util.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "../../services/quick-tutorial.service";
import { PreferencesService } from "../../services/preferences.service";
import { MyRecipesPreferenceKey } from "@recipesage/util/shared";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonList,
  IonListHeader,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonLabel,
  IonIcon,
} from "@ionic/angular";
import { checkmarkOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-home-popover",
  templateUrl: "home-popover.page.html",
  styleUrls: ["home-popover.page.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonListHeader,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonLabel,
    IonIcon,
  ],
})
export class HomePopoverPage {
  constructor() {
    addIcons({ checkmarkOutline });
  }

  translate = inject(TranslateService);
  popoverCtrl = inject(PopoverController);
  toastCtrl = inject(ToastController);
  utilService = inject(UtilService);
  preferencesService = inject(PreferencesService);
  quickTutorialService = inject(QuickTutorialService);

  preferences = this.preferencesService.preferences;
  preferenceKeys = MyRecipesPreferenceKey;

  @Input({
    required: true,
  })
  guestMode!: boolean;

  enterSelectionMode() {
    this.quickTutorialService.triggerQuickTutorial(
      QuickTutorialOptions.MultipleRecipeSelection,
    );

    this.popoverCtrl.dismiss({
      selectionMode: true,
    });
  }

  savePreferences(refreshSearch?: boolean) {
    this.preferencesService.save();

    this.dismiss(refreshSearch);
  }

  dismiss(refreshSearch?: boolean) {
    this.popoverCtrl.dismiss({
      refreshSearch,
    });
  }
}
