import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  inject,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { IS_SELFHOST } from "../../../../environments/environment";

import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  selector: "page-legal",
  templateUrl: "legal.page.html",
  styleUrls: ["legal.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class LegalPage implements AfterViewInit {
  route = inject(ActivatedRoute);

  isSelfHost = IS_SELFHOST;
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  @ViewChild("content") content?: any;

  ngAfterViewInit() {
    const scrollToSection = this.route.snapshot.queryParamMap.get("scrollTo");

    if (scrollToSection === "sharing") {
      setTimeout(() => {
        this.content?.scrollToBottom(200);
      });
    }
  }
}
