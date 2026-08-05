import { Injectable, inject } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class UnsavedChangesService {
  private router = inject(Router);
  private translate = inject(TranslateService);

  private pendingChanges = false;

  public get unsavedChangesMessage(): string {
    return this.translate.instant("services.unsavedChanges.message");
  }

  constructor() {
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
