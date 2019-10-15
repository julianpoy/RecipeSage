import { Component } from '@angular/core';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-release-notes',
  templateUrl: 'release-notes.page.html',
  styleUrls: ['release-notes.page.scss']
})
export class ReleaseNotesPage {
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  constructor() {}
}
