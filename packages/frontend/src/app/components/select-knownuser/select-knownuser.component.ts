import { Component, Input, Output, EventEmitter, inject } from "@angular/core";

import type { MessageThreadDTO, UserPublic } from "@recipesage/prisma";
import { ServerActionsService } from "../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonList,
  IonRadioGroup,
  IonListHeader,
  IonItem,
  IonAvatar,
  IonRadio,
  type RadioGroupCustomEvent,
} from "@ionic/angular/standalone";

@Component({
  standalone: true,
  selector: "select-knownuser",
  templateUrl: "select-knownuser.component.html",
  styleUrls: ["./select-knownuser.component.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonList,
    IonRadioGroup,
    IonListHeader,
    IonItem,
    IonAvatar,
    IonRadio,
  ],
})
export class SelectKnownUserComponent {
  private serverActionsService = inject(ServerActionsService);

  _radioFriendship?: UserPublic;
  _radioThread?: MessageThreadDTO;

  _selectedUser?: UserPublic;
  @Input()
  get selectedUser(): UserPublic | undefined {
    return this._selectedUser;
  }

  set selectedUser(val: UserPublic | undefined) {
    this._selectedUser = val;
    this.selectedUserChange.emit(this._selectedUser);

    if (this._radioThread && this._radioThread.otherUser.id !== val?.id) {
      this._radioThread = undefined;
    }
    if (this._radioFriendship && this._radioFriendship.id !== val?.id) {
      this._radioFriendship = undefined;
    }
  }

  @Output() selectedUserChange = new EventEmitter<UserPublic | undefined>();

  friendships: UserPublic[] = [];
  threads: MessageThreadDTO[] = [];

  constructor() {
    this.fetchFriendships();
  }

  async fetchFriendships() {
    const response = await this.serverActionsService.users.getMyFriends();
    if (!response) return;

    this.friendships = response.friends.sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    this.fetchThreads();
  }

  async fetchThreads() {
    const response = await this.serverActionsService.messages.getThreads();
    if (!response) return;

    const friendIds = new Set(
      this.friendships.map((friendship) => friendship.id),
    );
    this.threads = response
      .filter((thread) => !friendIds.has(thread.otherUser.id))
      .sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name));
  }

  friendshipRadioChanged(event: RadioGroupCustomEvent) {
    this.selectFriendship(event.detail.value);
  }

  threadRadioChanged(event: RadioGroupCustomEvent) {
    this.selectThread(event.detail.value);
  }

  selectFriendship(friendship: UserPublic) {
    if (!friendship) return;
    this._radioFriendship = friendship;
    this.selectedUser = friendship;
  }

  selectThread(thread: MessageThreadDTO) {
    if (!thread) return;
    this._radioThread = thread;
    this.selectedUser = thread.otherUser;
  }
}
