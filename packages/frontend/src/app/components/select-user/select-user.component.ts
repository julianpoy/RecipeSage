import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ToastController } from '@ionic/angular';

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
  @Output() searchInputChange = new EventEmitter();

  results = [];
  searchTimeout;
  searching = false;

  _searchText: string = '';
  get searchText() {
    return this._searchText;
  }
  set searchText(val: string) {
    this._searchText = val;
    this.searchInputChange.emit(val);
  }

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
    if (
      !this.searchText.trim()
      || this.searchText.trim() === '@'
    ) return;

    this.searching = true;

    this.searchTimeout = setTimeout(async () => {
      await this.search(this.searchText);
      this.searching = false;
    }, PAUSE_BEFORE_SEARCH);
  }

  async search(input: string) {
    input = input || '';
    const loading = this.loadingService.start();

    const results = [];

    const handle = input.startsWith('@') ? input.substring(1) : input;
    const profileResponse = await this.userService.getProfileByHandle(handle, {
      403: () => {},
      404: () => {}
    });
    if (profileResponse.success && profileResponse.data) {
      // TODO: Currently this pushes a profile rather than the direct user info
      // This should be cleaned up - preferrably with some typing
      results.push(profileResponse.data);
    }

    const userResponse = await this.userService.getUserByEmail({
      email: input
    }, {
      404: () => {}
    });

    if (userResponse.success && userResponse.data) results.push(userResponse.data);

    this.results = results;

    loading.dismiss();
  }

  selectUser(user) {
    this.selectedUser = user;
  }

  clearSelectedUser() {
    this.selectedUser = null;
    this.results = [];
    this.searchText = '';
    this.searching = false;
  }
}
