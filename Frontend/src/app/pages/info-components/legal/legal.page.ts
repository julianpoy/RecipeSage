import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-legal',
  templateUrl: 'legal.page.html',
  styleUrls: ['legal.page.scss']
})
export class LegalPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
