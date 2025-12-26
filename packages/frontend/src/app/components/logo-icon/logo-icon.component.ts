import { Component, Input } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "logo-icon",
  templateUrl: "logo-icon.component.html",
  styleUrls: ["./logo-icon.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class LogoIconComponent {
  @Input() href: string | undefined;
  @Input() noBg: boolean = false;

  constructor() {}
}
