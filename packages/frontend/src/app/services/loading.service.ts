import { Injectable, inject } from "@angular/core";

import { LoadingBarService } from "@ngx-loading-bar/core";
import { LoadingBarState } from "@ngx-loading-bar/core/loading-bar.state";

export interface LoadingRef {
  dismiss: () => void;
}

@Injectable({
  providedIn: "root",
})
export class LoadingService {
  private loadingBar = inject(LoadingBarService);

  REQUEST_COMPLETE_DELAY = 150;

  loadingBarRef: LoadingBarState;

  constructor() {
    this.loadingBarRef = this.loadingBar.useRef();
  }

  start(): LoadingRef {
    this.loadingBarRef.start();

    return {
      dismiss: () => {
        setTimeout(() => {
          this.loadingBarRef.complete();
        }, this.REQUEST_COMPLETE_DELAY);
      },
    };
  }
}
