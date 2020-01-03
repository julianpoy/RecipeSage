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

  async search(email) {
    const loading = this.loadingService.start();

    try {
      this.results = [await this.userService.getUserByEmail(email)];
    } catch (err) {
      console.log(err);
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlineFetchMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 404: // Result not found
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    }

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
