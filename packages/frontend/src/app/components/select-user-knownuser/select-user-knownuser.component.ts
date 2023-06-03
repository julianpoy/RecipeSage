import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "select-user-knownuser",
  templateUrl: "select-user-knownuser.component.html",
  styleUrls: ["./select-user-knownuser.component.scss"],
})
export class SelectUserKnownUserComponent {
  manualSelect: boolean = false;

  _userSelectState: any;
  _knownUserSelectState: any;

  _selectedUser: any;
  @Input()
  get selectedUser() {
    return this._selectedUser;
  }

  set selectedUser(val) {
    this._selectedUser = val;
    this.selectedUserChange.emit(this._selectedUser);

    if (this._userSelectState && this._userSelectState.id !== val?.id) {
      this._userSelectState = null;
    }
    if (
      this._knownUserSelectState &&
      this._knownUserSelectState.id !== val?.id
    ) {
      this._knownUserSelectState = null;
    }
  }

  @Output() selectedUserChange = new EventEmitter();

  constructor() {}
}
