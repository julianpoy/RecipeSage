import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "selfhost-warning-item",
  templateUrl: "selfhost-warning-item.component.html",
  styleUrls: ["./selfhost-warning-item.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelfhostWarningItemComponent {
  constructor() {}
}
