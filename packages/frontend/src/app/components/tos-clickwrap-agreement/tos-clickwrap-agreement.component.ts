import { Component, Input } from "@angular/core";

import { RouteMap } from "~/services/util.service";

@Component({
  selector: "tos-clickwrap-agreement",
  templateUrl: "tos-clickwrap-agreement.component.html",
  styleUrls: ["./tos-clickwrap-agreement.component.scss"],
})
export class TosClickwrapAgreementComponent {
  legalPath: string = RouteMap.LegalPage.getPath();

  constructor() {}
}
