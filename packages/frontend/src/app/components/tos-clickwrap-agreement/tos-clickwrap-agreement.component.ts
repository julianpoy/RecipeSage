import { Component, Input } from "@angular/core";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "tos-clickwrap-agreement",
  templateUrl: "tos-clickwrap-agreement.component.html",
  styleUrls: ["./tos-clickwrap-agreement.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class TosClickwrapAgreementComponent {
  legalPath: string = RouteMap.LegalPage.getPath();

  constructor() {}
}
