import { Component } from "@angular/core";

import { RouteMap } from "~/services/util.service";

@Component({
  selector: "page-contact",
  templateUrl: "contact.page.html",
  styleUrls: ["contact.page.scss"],
})
export class ContactPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
