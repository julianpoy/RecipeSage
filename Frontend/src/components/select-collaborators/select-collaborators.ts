import { Component, Input } from '@angular/core';

import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { ToastController, ViewController } from 'ionic-angular';
import { UtilServiceProvider } from '../../providers/util-service/util-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';

@Component({
  selector: 'select-collaborators',
  templateUrl: 'select-collaborators.html'
})
export class SelectCollaboratorsComponent {

  _selectedThreads: any;
  @Input()
  set selectedThreads(val) {
    this._selectedThreads = val;
  }

  get selectedThreads() {
    return this._selectedThreads;
  }

  threadsByUserId: any = {};
  existingThreads: any = [];
  pendingThread: string = '';
  showAutocomplete: boolean = false;
  autocompleteSelectionIdx: number = -1;

  // Holds user autocomplete variables
  pendingCollaboratorName: any = '';
  pendingCollaboratorId: any = '';
  searchingForRecipient: boolean = false;
  autofillTimeout: any;

  constructor(
    public toastCtrl: ToastController,
    public viewCtrl: ViewController,
    public userService: UserServiceProvider,
    public utilService: UtilServiceProvider,
    public loadingService: LoadingServiceProvider,
    public messagingService: MessagingServiceProvider,
  ) {
    this.loadThreads().then(() => { }, () => { });
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads().subscribe(response => {
        this.existingThreads = response.map(el => {
          this.threadsByUserId[el.otherUser.id] = el.otherUser;
          console.log(el.otherUser)
          return el.otherUser;
        });

        resolve();
      }, err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.viewCtrl.dismiss({
              destination: 'LoginPage',
              setRoot: true
            });
            break;
          default:
            let errorToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  autofillUserName(callback) {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(() => {
      this.userService.getUserByEmail(this.pendingThread.trim()).subscribe(response => {
        if (!this.threadsByUserId[response.id]) {
          this.existingThreads.push(response);
          this.threadsByUserId[response.id] = response;
        }

        this.pendingCollaboratorName = response.name || response.email;
        this.pendingCollaboratorId = response.id;
        this.searchingForRecipient = false;

        if (callback) callback.call(null);
      }, err => {
        this.pendingCollaboratorName = '';
        this.pendingCollaboratorId = '';
        this.searchingForRecipient = false;

        if (callback) callback.call(null);
      });
    }, 500);
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
    this.autocompleteSelectionIdx = -1;
  }

  labelFieldKeyUp(event) {
    // Only listen for up or down arrow
    if (event.keyCode !== 38 && event.keyCode !== 40) return;

    // Get all suggestions (including click to create)
    var suggestions = document.getElementsByClassName('autocomplete')[0].children;

    // If result list size was reduced, do not overflow
    if (this.autocompleteSelectionIdx > suggestions.length - 1) this.autocompleteSelectionIdx = suggestions.length - 1;

    if (event.keyCode === 40 && this.autocompleteSelectionIdx < suggestions.length - 1) {
      // Arrow Down
      this.autocompleteSelectionIdx++;
    } else if (event.keyCode === 38 && this.autocompleteSelectionIdx >= 0) {
      // Arrow Up
      this.autocompleteSelectionIdx--;
    }

    if (this.autocompleteSelectionIdx === -1) {
      (document.getElementById('labelInputField') as HTMLElement).focus();
    } else {
      (suggestions[this.autocompleteSelectionIdx] as HTMLElement).focus();
    }
  }

  onAddCollaboratorEnter($event) {
    this.autofillUserName(() => {
      if (this.pendingCollaboratorId) {
        $event.target.value = '';

        this.addCollaborator(this.pendingCollaboratorId);
      } else {
        this.toastCtrl.create({
          message: 'Could not find user with that email address.',
          duration: 6000
        }).present();
      }
    });
  }

  addCollaborator(userId) {
    if (userId.length === 0) {
      this.toastCtrl.create({
        message: 'Please enter a valid email and press enter.',
        duration: 6000
      }).present();
      return;
    }

    this.selectedThreads.push(userId);

    this.toggleAutocomplete(false);

    this.pendingThread = '';
  }

  removeCollaborator(userId) {
    this.selectedThreads.splice(this.selectedThreads.indexOf(userId), 1);
  }
}
