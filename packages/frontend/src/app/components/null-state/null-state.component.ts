import { Component, ChangeDetectionStrategy } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonGrid, IonRow } from "@ionic/angular";

@Component({
  standalone: true,
  selector: "null-state",
  templateUrl: "null-state.component.html",
  styleUrls: ["./null-state.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS, IonGrid, IonRow],
})
export class NullStateComponent {
  constructor() {}
}
