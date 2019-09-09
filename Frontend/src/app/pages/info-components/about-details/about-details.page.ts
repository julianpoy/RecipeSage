import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-about-details',
  templateUrl: 'about-details.page.html',
  styleUrls: ['about-details.page.scss']
})
export class AboutDetailsPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
