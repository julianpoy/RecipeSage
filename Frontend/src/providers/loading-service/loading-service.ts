import { Injectable } from '@angular/core';

import { LoadingBarService } from '@ngx-loading-bar/core';

@Injectable()
export class LoadingServiceProvider {

  waiting: any = [];

  constructor(private loadingBar: LoadingBarService) {
    console.log('Hello LoadingServiceProvider Provider');
  }
  
  start() {
    this.loadingBar.start();
    console.log("starting!")
    
    var me = this;
    var id = Math.random();
    me.waiting.push(id);
    return {
      dismiss: function() {
        var idx = me.waiting.indexOf(id);
        me.waiting.splice(idx, 1);
        me.checkWaiting.call(me);
      }
    }
  }
  
  checkWaiting() {
    if (this.waiting.length === 0) {
      this.loadingBar.complete();
    }
  }
}
