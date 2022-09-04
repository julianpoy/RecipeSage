import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IS_SELFHOST } from 'src/environments/environment';

import { RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-legal',
  templateUrl: 'legal.page.html',
  styleUrls: ['legal.page.scss']
})
export class LegalPage implements AfterViewInit {
  isSelfHost = IS_SELFHOST;
  defaultBackHref: string = RouteMap.AboutPage.getPath();

  @ViewChild('content') content;

  constructor(
    public route: ActivatedRoute,
  ) {}

  ngAfterViewInit() {
    const scrollToSection = this.route.snapshot.queryParamMap.get('scrollTo');

    if (scrollToSection === 'sharing') {
      setTimeout(() => {
        this.content.scrollToBottom(200);
      });
    }
  }
}
