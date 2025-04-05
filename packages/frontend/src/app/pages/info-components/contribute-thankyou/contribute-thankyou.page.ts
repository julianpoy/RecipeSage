import { Component } from "@angular/core";

import { RouteMap } from "~/services/util.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { LogoIconComponent } from "../../../components/logo-icon/logo-icon.component";

@Component({
  selector: "page-contribute-thankyou",
  templateUrl: "contribute-thankyou.page.html",
  styleUrls: ["contribute-thankyou.page.scss"],
  imports: [...SHARED_UI_IMPORTS, LogoIconComponent],
})
export class ContributeThankYouPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();
  accountPath: string = RouteMap.AccountPage.getPath();

  constructor(private capabilitiesService: CapabilitiesService) {
    this.capabilitiesService.updateCapabilities();
  }
}
