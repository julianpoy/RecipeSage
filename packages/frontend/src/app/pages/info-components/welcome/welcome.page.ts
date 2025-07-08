import { Component, inject } from "@angular/core";
import { NavController, Platform } from "@ionic/angular";
import { RouteMap, AuthType } from "~/services/util.service";

import { IS_SELFHOST } from "../../../../environments/environment";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-welcome",
  templateUrl: "welcome.page.html",
  styleUrls: ["welcome.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class WelcomePage {
  navCtrl = inject(NavController);
  platform = inject(Platform);

  isSelfHost = IS_SELFHOST;
  isIOS: boolean = this.platform.is("ios");
  isCapacitor: boolean = this.platform.is("capacitor");

  constructor() {
    if (localStorage.getItem("token")) {
      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
    }
  }

  goToAuth(type: "login" | "register") {
    const register = type === "register";

    if (register) {
      this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Register));
    } else {
      this.navCtrl.navigateRoot(RouteMap.AuthPage.getPath(AuthType.Login));
    }
  }
}
