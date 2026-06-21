import { Component, Input, Output, EventEmitter } from "@angular/core";
import type { UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SelectKnownUserComponent } from "../select-knownuser/select-knownuser.component";
import { SelectUserComponent } from "../select-user/select-user.component";

@Component({
  standalone: true,
  selector: "select-user-knownuser",
  templateUrl: "select-user-knownuser.component.html",
  styleUrls: ["./select-user-knownuser.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectKnownUserComponent,
    SelectUserComponent,
  ],
})
export class SelectUserKnownUserComponent {
  manualSelect: boolean = false;

  _userSelectState?: UserPublic;
  _knownUserSelectState?: UserPublic;

  _selectedUser?: UserPublic;
  @Input()
  get selectedUser(): UserPublic | undefined {
    return this._selectedUser;
  }

  set selectedUser(val: UserPublic | undefined) {
    this._selectedUser = val;
    this.selectedUserChange.emit(this._selectedUser);

    if (this._userSelectState && this._userSelectState.id !== val?.id) {
      this._userSelectState = undefined;
    }
    if (
      this._knownUserSelectState &&
      this._knownUserSelectState.id !== val?.id
    ) {
      this._knownUserSelectState = undefined;
    }
  }

  @Output() selectedUserChange = new EventEmitter<UserPublic | undefined>();
}
