import { Component } from "@angular/core";
import { NavController, Platform } from "@ionic/angular";
import { RouteMap, AuthType } from "~/services/util.service";

import { IS_SELFHOST } from "../../../../environments/environment";

@Component({
  selector: "page-welcome",
  templateUrl: "welcome.page.html",
  styleUrls: ["welcome.page.scss"],
})
export class WelcomePage {
  isSelfHost = IS_SELFHOST;
  isIOS: boolean = this.platform.is("ios");
  isCapacitor: boolean = this.platform.is("capacitor");

  constructor(
    public navCtrl: NavController,
    public platform: Platform,
  ) {
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
