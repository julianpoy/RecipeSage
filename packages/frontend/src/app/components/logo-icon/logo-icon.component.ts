import { Component, Input, ChangeDetectionStrategy } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "logo-icon",
  templateUrl: "logo-icon.component.html",
  styleUrls: ["./logo-icon.component.scss"],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [...SHARED_UI_IMPORTS],
})
export class LogoIconComponent {
  @Input() routerLink: string | undefined;
  @Input() noBg: boolean = false;

  constructor() {}
}
