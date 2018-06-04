import { Injectable } from '@angular/core';

import { LoadingBarService } from '@ngx-loading-bar/core';

@Injectable()
export class LoadingServiceProvider {

  constructor(private loadingBar: LoadingBarService) {
    console.log('Hello LoadingServiceProvider Provider');
  }
  
  start() {
    this.loadingBar.start();

    var me = this;
    return {
      dismiss: function() {
        me.loadingBar.complete();
      }
    }
  }
}
