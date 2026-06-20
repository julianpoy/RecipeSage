import {
  Component,
  EventEmitter,
  Input,
  Output,
  type AfterViewInit,
  inject,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "../../services/loading.service";
import { MessagingService } from "../../services/messaging.service";
import { ToastController, ModalController } from "@ionic/angular/standalone";
import { UtilService } from "../../services/util.service";
import { UserService } from "../../services/user.service";
import { ServerActionsService } from "../../services/server-actions.service";
import type { UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SelectUserComponent } from "../select-user/select-user.component";
import { IonIcon } from "@ionic/angular/standalone";
import { trash } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "select-collaborators",
  templateUrl: "select-collaborators.component.html",
  styleUrls: ["./select-collaborators.component.scss"],
  imports: [...SHARED_UI_IMPORTS, SelectUserComponent, IonIcon],
})
export class SelectCollaboratorsComponent implements AfterViewInit {
  constructor() {
    addIcons({ trash });
  }

  toastCtrl = inject(ToastController);
  modalCtrl = inject(ModalController);
  userService = inject(UserService);
  serverActionsService = inject(ServerActionsService);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  messagingService = inject(MessagingService);
  translate = inject(TranslateService);

  @Input() selectedCollaboratorIds: string[] = [];
  @Output() selectedCollaboratorIdsChanged = new EventEmitter<string[]>();

  userProfilesById: Map<string, UserPublic> = new Map();

  ngAfterViewInit() {
    this.loadUserProfiles();
  }

  async loadUserProfiles() {
    if (!this.selectedCollaboratorIds.length) return;

    const userProfiles =
      await this.serverActionsService.users.getUserProfilesById({
        ids: this.selectedCollaboratorIds,
      });

    if (!userProfiles) return;
    for (const userProfile of userProfiles) {
      this.userProfilesById.set(userProfile.id, userProfile);
    }
  }

  async addCollaborator(userProfile: UserPublic) {
    if (this.selectedCollaboratorIds.includes(userProfile.id)) return;

    this.userProfilesById.set(userProfile.id, userProfile);
    this.selectedCollaboratorIds.push(userProfile.id);
    this.selectedCollaboratorIdsChanged.emit(this.selectedCollaboratorIds);
  }

  removeCollaborator(userId: string) {
    this.selectedCollaboratorIds.splice(
      this.selectedCollaboratorIds.indexOf(userId),
      1,
    );
    this.selectedCollaboratorIdsChanged.emit(this.selectedCollaboratorIds);
  }
}
