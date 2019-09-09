import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-contribute',
  templateUrl: 'contribute.page.html',
  styleUrls: ['contribute.page.scss']
})
export class ContributePage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
