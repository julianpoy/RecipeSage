import { Injectable } from '@angular/core';
import { UtilService } from './util.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';

export const UNSAVED_CHANGES_MESSAGE = 'It looks like you have been editing something. '
  + 'If you leave before saving, your changes will be lost.';

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesService {

  private pendingChanges = false;

  constructor(
    private utilService: UtilService,
    private router: Router
  ) {
    // Reset pending changes after every navigation event
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.clearPendingChanges();
      }
    });

    // Listen for leave events
    window.addEventListener('beforeunload', e => {
      if (!this.pendingChanges) return undefined;

      (e || window.event).returnValue = UNSAVED_CHANGES_MESSAGE; // Gecko + IE
      return UNSAVED_CHANGES_MESSAGE; // Gecko + Webkit, Safari, Chrome etc.
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
