import { Component, Input } from '@angular/core';

import { LoadingService } from '../../services/loading.service';
import { MessagingService } from '../../services/messaging.service';
import { ToastController, ModalController } from '@ionic/angular';
import { UtilService } from '../../services/util.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'select-collaborators',
  templateUrl: 'select-collaborators.component.html',
  styleUrls: ['./select-collaborators.component.scss']
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
  pendingThread = '';
  showAutocomplete = false;

  // Holds user autocomplete variables
  pendingCollaboratorName: any = '';
  pendingCollaboratorId: any = '';
  searchingForRecipient = false;
  autofillTimeout: any;

  constructor(
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public userService: UserService,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public messagingService: MessagingService,
  ) {
    this.loadThreads().then(() => { }, () => { });
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads().then(response => {
        this.existingThreads = response.map(el => {
          this.threadsByUserId[el.otherUser.id] = el.otherUser;
          console.log(el.otherUser);
          return el.otherUser;
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.response.status) {
          case 0:
            const offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // TODO: This may need to be improved. Previously, this tried to dismiss as a modal with return message
            const unauthorizedToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unauthorized,
              duration: 30000
            });
            unauthorizedToast.present();
            break;
          default:
            const errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  autofillUserName(callback?) {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(async () => {
      const user = await this.userService.getUserByEmail(this.pendingThread.trim(), {
        404: () => {}
      });

      if (user) {
        if (!this.threadsByUserId[user.id]) {
          this.existingThreads.push(user);
          this.threadsByUserId[user.id] = user;
        }

        this.pendingCollaboratorName = user.name || user.email;
        this.pendingCollaboratorId = user.id;
      } else {
        this.pendingCollaboratorName = '';
        this.pendingCollaboratorId = '';
      }

      this.searchingForRecipient = false;

      if (callback) callback.call(null);
    }, 500);
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
  }

  onAddCollaboratorEnter($event) {
    this.autofillUserName(async () => {
      if (this.pendingCollaboratorId) {
        $event.target.value = '';

        this.addCollaborator(this.pendingCollaboratorId);
      } else {
        (await this.toastCtrl.create({
          message: 'Could not find user with that email address.',
          duration: 6000
        })).present();
      }
    });
  }

  async addCollaborator(userId) {
    if (userId.length === 0) {
      (await this.toastCtrl.create({
        message: 'Please enter a valid email and press enter.',
        duration: 6000
      })).present();
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
