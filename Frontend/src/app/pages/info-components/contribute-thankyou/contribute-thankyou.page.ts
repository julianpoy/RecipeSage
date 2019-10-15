import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-contribute-thankyou',
  templateUrl: 'contribute-thankyou.page.html',
  styleUrls: ['contribute-thankyou.page.scss']
})
export class ContributeThankYouPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
