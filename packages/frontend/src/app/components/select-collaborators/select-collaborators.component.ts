import {
  Component,
  EventEmitter,
  Input,
  Output,
  type AfterViewInit,
} from "@angular/core";
import { TranslateService } from "@ngx-translate/core";

import { LoadingService } from "../../services/loading.service";
import { MessagingService } from "../../services/messaging.service";
import { ToastController, ModalController } from "@ionic/angular";
import { UtilService } from "../../services/util.service";
import { UserService } from "../../services/user.service";
import { TRPCService } from "../../services/trpc.service";
import type { UserPublic } from "@recipesage/prisma";

@Component({
  selector: "select-collaborators",
  templateUrl: "select-collaborators.component.html",
  styleUrls: ["./select-collaborators.component.scss"],
})
export class SelectCollaboratorsComponent implements AfterViewInit {
  @Input() selectedCollaboratorIds: string[] = [];
  @Output() selectedCollaboratorIdsChanged = new EventEmitter<string[]>();

  userProfilesById: Map<string, UserPublic> = new Map();

  constructor(
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public userService: UserService,
    public trpcService: TRPCService,
    public utilService: UtilService,
    public loadingService: LoadingService,
    public messagingService: MessagingService,
    public translate: TranslateService,
  ) {}

  ngAfterViewInit() {
    this.loadUserProfiles();
  }

  async loadUserProfiles() {
    if (!this.selectedCollaboratorIds.length) return;

    const userProfiles = await this.trpcService.handle(
      this.trpcService.trpc.users.getUserProfilesById.query({
        ids: this.selectedCollaboratorIds,
      }),
    );

    if (!userProfiles) return;
    for (const userProfile of userProfiles) {
      this.userProfilesById.set(userProfile.id, userProfile);
    }
  }

  async addCollaborator(userProfile: UserPublic) {
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
