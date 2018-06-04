import { Injectable } from '@angular/core';

import { LoadingBarService } from '@ngx-loading-bar/core';

@Injectable()
export class LoadingServiceProvider {

  WAIT_TIMEOUT: number = 200;

  waiting: any = [];
  timeout: any;

  constructor(private loadingBar: LoadingBarService) {
    console.log('Hello LoadingServiceProvider Provider');
  }
  
  start() {
    
    var me = this;
    var id = Date.now();
    if (me.waiting.length === 0) this.loadingBar.start();
    me.waiting.push(id);
    console.log("added!", this.waiting.length)
    return {
      dismiss: function() {
        var idx = me.waiting.indexOf(id);
        me.waiting.splice(idx, 1);
        if (me.timeout) clearTimeout(me.timeout);
        console.log("scheduled removal!", me.waiting.length)
        me.timeout = setTimeout(function() {
          console.log("removed!", me.waiting.length)
          me.checkWaiting.call(me);
        }, me.WAIT_TIMEOUT);
      }
    }
  }
  
  checkWaiting() {
    if (this.waiting.length === 0) {
      this.loadingBar.complete();
    }
  }
}
