import { Component } from '@angular/core';

import { IS_SELFHOST } from 'src/environments/environment';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-legal',
  templateUrl: 'legal.page.html',
  styleUrls: ['legal.page.scss']
})
export class LegalPage {
  isSelfHost = IS_SELFHOST;
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
