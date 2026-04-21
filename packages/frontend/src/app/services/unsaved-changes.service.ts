import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router, NavigationEnd } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class UnsavedChangesService {
  private router = inject(Router);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  private pendingChanges = false;
  public unsavedChangesMessage = "";

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.translate
      .get("services.unsavedChanges.message")
      .toPromise()
      .then((unsavedChangesMessage) => {
        this.unsavedChangesMessage = unsavedChangesMessage;
      });

    // Reset pending changes after every navigation event
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.clearPendingChanges();
      }
    });

    // Listen for leave events
    window.addEventListener("beforeunload", (e) => {
      if (!this.pendingChanges) return undefined;

      (e || window.event).returnValue = this.unsavedChangesMessage; // Gecko + IE
      return this.unsavedChangesMessage; // Gecko + Webkit, Safari, Chrome etc.
    });
  }

  setPendingChanges() {
    this.pendingChanges = true;
  }

  hasPendingChanges() {
    return this.pendingChanges;
  }

  clearPendingChanges() {
    this.pendingChanges = false;
  }
}
