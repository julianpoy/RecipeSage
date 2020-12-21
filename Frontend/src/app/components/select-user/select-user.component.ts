import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { isHandleValid } from '../../../../../SharedUtils/src';

import { UserService } from '@/services/user.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap } from '@/services/util.service';

const PAUSE_BEFORE_SEARCH = 500; // Ms

@Component({
  selector: 'select-user',
  templateUrl: 'select-user.component.html',
  styleUrls: ['./select-user.component.scss']
})
export class SelectUserComponent {
  _selectedUser: any;
  @Input()
  get selectedUser() {
    return this._selectedUser;
  }

  set selectedUser(val) {
    this._selectedUser = val;
    this.selectedUserChange.emit(this._selectedUser);
  }

  @Output() selectedUserChange = new EventEmitter();

  results = [];
  searchTimeout;
  searchText = "";
  searching = false;

  constructor(
    private utilService: UtilService,
    private toastCtrl: ToastController,
    private userService: UserService,
    private loadingService: LoadingService
  ) {}

  onSearchInputChange(event) {
    this.searchText = event.detail.value;

    this.results = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchText.trim()) return;

    this.searching = true;

    this.searchTimeout = setTimeout(async () => {
      await this.search(this.searchText);
      this.searching = false;
    }, PAUSE_BEFORE_SEARCH);
  }

  async search(input) {
    input = input || "";
    const loading = this.loadingService.start();

    const results = [];

    const handle = input.startsWith('@') ? input.substring(1) : input;
    if (isHandleValid(handle)) {
      const profile = await this.userService.getProfileByHandle(input, {
        403: () => {},
        404: () => {}
      });
      if (profile) {
        const user = await this.userService.getUserById(input);
        if (user) {
          results.push(user);
        }
      }
    }

    const user = await this.userService.getUserByEmail(input, {
      404: () => {}
    });

    if (user) results.push(user);

    this.results = results;

    loading.dismiss();
  }

  selectUser(user) {
    this.selectedUser = user;
  }

  clearSelectedUser() {
    this.selectedUser = null;
    this.results = [];
    this.searchText = "";
    this.searching = false;
  }
}
