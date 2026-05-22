import { Component } from "@angular/core";

import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SocialLinksComponent } from "../../../components/social-links/social-links.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
} from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: "page-contact",
  templateUrl: "contact.page.html",
  styleUrls: ["contact.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SocialLinksComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
  ],
})
export class ContactPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();
  showEmail = false;

  constructor() {}

  revealEmail() {
    this.showEmail = true;
  }
}
