import { Injectable } from "@angular/core";
import { CanDeactivate } from "@angular/router";
import { UnsavedChangesService } from "./unsaved-changes.service";

@Injectable()
export class UnsavedChangesGuardService implements CanDeactivate<any> {
  constructor(private unsavedChangesService: UnsavedChangesService) {}

  canDeactivate() {
    if (this.unsavedChangesService.hasPendingChanges()) {
      return confirm(this.unsavedChangesService.unsavedChangesMessage);
    }
    return true;
  }
}
