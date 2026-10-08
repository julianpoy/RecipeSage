import { Component, Input, inject } from "@angular/core";
import {
  PopoverController,
  IonList,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";

import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { banOutline, flagOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

export type UserActionsPopoverAction = "report" | "block" | "unblock";

@Component({
  standalone: true,
  selector: "page-user-actions-popover",
  templateUrl: "user-actions-popover.page.html",
  styleUrls: ["user-actions-popover.page.scss"],
  imports: [...SHARED_UI_IMPORTS, IonList, IonButton, IonIcon],
})
export class UserActionsPopoverPage {
  private popoverCtrl = inject(PopoverController);

  @Input() isBlockedByMe = false;

  constructor() {
    addIcons({ banOutline, flagOutline });
  }

  closeWithAction(action: UserActionsPopoverAction) {
    this.popoverCtrl.dismiss({
      action,
    });
  }
}
