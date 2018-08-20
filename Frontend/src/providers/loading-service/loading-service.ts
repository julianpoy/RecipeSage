import { Injectable } from '@angular/core';

import { LoadingBarService } from '@ngx-loading-bar/core';

@Injectable()
export class LoadingServiceProvider {

  REQUEST_COMPLETE_DELAY: number = 150;

  constructor(private loadingBar: LoadingBarService) {}

  start() {
    this.loadingBar.start();

    var me = this;
    return {
      dismiss: function() {
        setTimeout(function() {
          me.loadingBar.complete();
        }, me.REQUEST_COMPLETE_DELAY);
      }
    }
  }
}
