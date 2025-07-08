import { Injectable, inject } from "@angular/core";
import { NavController } from "@ionic/angular";
import { UtilService, RouteMap } from "./util.service";

@Injectable()
export class DefaultPageGuardService {
  private navCtrl = inject(NavController);
  private utilService = inject(UtilService);

  canActivate() {
    const isLoggedIn = this.utilService.isLoggedIn();

    if (isLoggedIn)
      this.navCtrl.navigateRoot(RouteMap.HomePage.getPath("main"));
    else this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());

    return false;
  }
}
