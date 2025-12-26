import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "null-state",
  templateUrl: "null-state.component.html",
  styleUrls: ["./null-state.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class NullStateComponent {
  constructor() {}
}
