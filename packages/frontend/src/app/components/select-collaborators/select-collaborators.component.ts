import { Component, Input } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "../../services/loading.service";
import { MessagingService } from "../../services/messaging.service";
import { ToastController, ModalController } from "@ionic/angular";
import { UtilService } from "../../services/util.service";
import { UserService } from "../../services/user.service";

@Component({
  selector: "select-collaborators",
  templateUrl: "select-collaborators.component.html",
  styleUrls: ["./select-collaborators.component.scss"],
})
export class SelectCollaboratorsComponent {
  _selectedCollaboratorIds: string[];
  @Input()
  set selectedCollaboratorIds(val) {
    this._selectedCollaboratorIds = val;
  }

  get selectedCollaboratorIds() {
    return this._selectedCollaboratorIds;
  }

  threadsByUserId: any = {};
  existingThreads: any = [];
  pendingThread = "";
  showAutocomplete = false;

  // Holds user autocomplete variables
  pendingCollaboratorName: any = "";
  pendingCollaboratorId: any = "";
  searchingForRecipient = false;
  autofillTimeout: any;

  constructor(
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public userService: UserService,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public messagingService: MessagingService,
    public translate: TranslateService
  ) {
    this.loadThreads().then(
      () => {},
      () => {}
    );
  }

  async loadThreads() {
    const response = await this.messagingService.threads();
    if (!response.success) return;

    this.existingThreads = response.data.map((el) => {
      this.threadsByUserId[el.otherUser.id] = el.otherUser;
      console.log(el.otherUser);
      return el.otherUser;
    });
  }

  autofillUserName(callback?) {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(async () => {
      const response = await this.userService.getUserByEmail(
        {
          email: this.pendingThread.trim(),
        },
        {
          404: () => {},
        }
      );

      if (response.success) {
        const user = response.data;
        if (!this.threadsByUserId[user.id]) {
          this.existingThreads.push(user);
          this.threadsByUserId[user.id] = user;
        }

        this.pendingCollaboratorName = user.name || user.email;
        this.pendingCollaboratorId = user.id;
      } else {
        this.pendingCollaboratorName = "";
        this.pendingCollaboratorId = "";
      }

      this.searchingForRecipient = false;

      if (callback) callback.call(null);
    }, 500);
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf("suggestion") > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
  }

  onAddCollaboratorEnter($event) {
    this.autofillUserName(async () => {
      if (this.pendingCollaboratorId) {
        $event.target.value = "";

        this.addCollaborator(this.pendingCollaboratorId);
      } else {
        const message = await this.translate
          .get("components.selectCollaborators.notFoundError")
          .toPromise();
        (
          await this.toastCtrl.create({
            message,
            duration: 6000,
          })
        ).present();
      }
    });
  }

  async addCollaborator(userId) {
    if (userId.length === 0) {
      const message = await this.translate
        .get("components.selectCollaborators.invalidEmail")
        .toPromise();
      (
        await this.toastCtrl.create({
          message,
          duration: 6000,
        })
      ).present();
      return;
    }

    this.selectedCollaboratorIds.push(userId);

    this.toggleAutocomplete(false);

    this.pendingThread = "";
  }

  removeCollaborator(userId) {
    this.selectedCollaboratorIds.splice(
      this.selectedCollaboratorIds.indexOf(userId),
      1
    );
  }
}
