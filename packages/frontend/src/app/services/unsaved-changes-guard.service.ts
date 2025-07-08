import { Injectable, inject } from "@angular/core";
import { CanDeactivate } from "@angular/router";
import { UnsavedChangesService } from "./unsaved-changes.service";

@Injectable()
export class UnsavedChangesGuardService implements CanDeactivate<any> {
  private unsavedChangesService = inject(UnsavedChangesService);

  canDeactivate() {
    if (this.unsavedChangesService.hasPendingChanges()) {
      return confirm(this.unsavedChangesService.unsavedChangesMessage);
    }
    return true;
  }
}
