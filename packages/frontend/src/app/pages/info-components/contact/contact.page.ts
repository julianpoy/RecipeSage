import { Component } from "@angular/core";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";

@Component({
  standalone: true,
  selector: "page-contact",
  templateUrl: "contact.page.html",
  styleUrls: ["contact.page.scss"],
  imports: [...SHARED_UI_IMPORTS, SocialLinksComponent],
})
export class ContactPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
