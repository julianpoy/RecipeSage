import { Component, Input } from "@angular/core";

@Component({
  selector: "logo-icon",
  templateUrl: "logo-icon.component.html",
  styleUrls: ["./logo-icon.component.scss"],
})
export class LogoIconComponent {
  @Input({
    required: true,
  })
  href!: string;
  @Input() noBg: boolean = false;

  constructor() {}
}
