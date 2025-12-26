import { Component } from "@angular/core";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "social-links",
  templateUrl: "social-links.component.html",
  styleUrls: ["./social-links.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SocialLinksComponent {
  constructor() {}
}
