import { Component, Input, Output, EventEmitter } from "@angular/core";

import { UserService } from "~/services/user.service";
import { MessageThread, MessagingService } from "~/services/messaging.service";

@Component({
  selector: "select-knownuser",
  templateUrl: "select-knownuser.component.html",
  styleUrls: ["./select-knownuser.component.scss"],
})
export class SelectKnownUserComponent {
  _radioFriendship: any;
  _radioThread: any;

  _selectedUser: any;
  @Input()
  get selectedUser() {
    return this._selectedUser;
  }

  set selectedUser(val) {
    this._selectedUser = val;
    this.selectedUserChange.emit(this._selectedUser);

    if (this._radioThread && this._radioThread.otherUser.id !== val?.id) {
      this._radioThread = null;
    }
    if (
      this._radioFriendship &&
      this._radioFriendship.otherUser.id !== val?.id
    ) {
      this._radioFriendship = null;
    }
  }

  @Output() selectedUserChange = new EventEmitter();

  friendships: any[] = [];
  threads: MessageThread[] = [];

  constructor(
    private userService: UserService,
    private messagingService: MessagingService,
  ) {
    this.fetchFriendships();
  }

  async fetchFriendships() {
    const response = await this.userService.getMyFriends();
    if (!response.success) return;

    this.friendships = response.data.friends.sort((a: any, b: any) =>
      a.otherUser.name.localeCompare(b.otherUser.name),
    );

    this.fetchThreads();
  }

  async fetchThreads() {
    const response = await this.messagingService.threads({
      limit: 0,
    });
    if (!response.success) return;

    const friendIds = new Set(
      this.friendships.map((friendship) => friendship.otherUser.id),
    );
    this.threads = response.data
      .filter((thread) => !friendIds.has(thread.otherUser.id))
      .sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name));
  }

  friendshipRadioChanged(event: any) {
    this.selectFriendship(event.detail.value);
  }

  threadRadioChanged(event: any) {
    this.selectThread(event.detail.value);
  }

  selectFriendship(friendship: any) {
    if (!friendship) return;
    this._radioFriendship = friendship;
    this.selectedUser = friendship.otherUser;
  }

  selectThread(thread: MessageThread) {
    if (!thread) return;
    this._radioThread = thread;
    this.selectedUser = thread.otherUser;
  }
}
