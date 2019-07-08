import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-contribute-cancel',
  templateUrl: 'contribute-cancel.page.html',
  styleUrls: ['contribute-cancel.page.scss']
})
export class ContributeCancelPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
