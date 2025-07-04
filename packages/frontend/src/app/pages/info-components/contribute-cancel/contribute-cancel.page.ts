import { Component, inject } from "@angular/core";

import { RouteMap } from "~/services/util.service";
import { CapabilitiesService } from "~/services/capabilities.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { LogoIconComponent } from "../../../components/logo-icon/logo-icon.component";

@Component({
  selector: "page-contribute-cancel",
  templateUrl: "contribute-cancel.page.html",
  styleUrls: ["contribute-cancel.page.scss"],
  imports: [...SHARED_UI_IMPORTS, LogoIconComponent],
})
export class ContributeCancelPage {
  private capabilitiesService = inject(CapabilitiesService);

  defaultBackHref: string = RouteMap.AboutPage.getPath();
  contributePath: string = RouteMap.ContributePage.getPath();

  constructor() {
    this.capabilitiesService.updateCapabilities();
  }
}
