import { Component, ChangeDetectionStrategy } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonItem, IonLabel } from "@ionic/angular";

@Component({
  standalone: true,
  selector: "selfhost-warning-item",
  templateUrl: "selfhost-warning-item.component.html",
  styleUrls: ["./selfhost-warning-item.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonItem, IonLabel],
})
export class SelfhostWarningItemComponent {
  constructor() {}
}
