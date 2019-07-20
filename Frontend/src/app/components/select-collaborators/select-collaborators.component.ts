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
  pendingThread: string = '';
  showAutocomplete: boolean = false;

  // Holds user autocomplete variables
  pendingCollaboratorName: any = '';
  pendingCollaboratorId: any = '';
  searchingForRecipient: boolean = false;
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
          console.log(el.otherUser)
          return el.otherUser;
        });

        resolve();
      }).catch(async err => {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            // this.modalCtrl.dismiss({
            //   destination: 'LoginPage',
            //   setRoot: true
            // });
            // TODO: Figure this mess out - this is not a modal!
            break;
          default:
            let errorToast = await this.toastCtrl.create({
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
      this.userService.getUserByEmail(this.pendingThread.trim()).then(response => {
        if (!this.threadsByUserId[response.id]) {
          this.existingThreads.push(response);
          this.threadsByUserId[response.id] = response;
        }

        this.pendingCollaboratorName = response.name || response.email;
        this.pendingCollaboratorId = response.id;
        this.searchingForRecipient = false;

        if (callback) callback.call(null);
      }).catch(err => {
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
