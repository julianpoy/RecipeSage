import { Component } from "@angular/core";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonButton,
} from "@ionic/angular/standalone";

import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { AuthType, RouteMap } from "../../services/util.service";

@Component({
  standalone: true,
  selector: "page-get-started",
  templateUrl: "get-started.page.html",
  styleUrls: ["get-started.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonContent,
    IonButton,
  ],
})
export class GetStartedPage {
  registerPath = RouteMap.AuthPage.getPath(AuthType.Register);
  loginPath = RouteMap.AuthPage.getPath(AuthType.Login);
}
