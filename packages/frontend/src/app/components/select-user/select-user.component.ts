import { Component, Output, EventEmitter, Input, inject } from "@angular/core";

import { LoadingService } from "~/services/loading.service";
import { TRPCService } from "../../services/trpc.service";
import type { UserPublic } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";

const PAUSE_BEFORE_SEARCH = 500; // Ms

@Component({
  standalone: true,
  selector: "select-user",
  templateUrl: "select-user.component.html",
  styleUrls: ["./select-user.component.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SelectUserComponent {
  private trpcService = inject(TRPCService);
  private loadingService = inject(LoadingService);

  @Input() selectedUser?: UserPublic;
  @Input() enableSelectedMode = true;
  @Output() selectedUserChange = new EventEmitter<UserPublic>();
  @Output() searchInputChange = new EventEmitter<string>();

  results: UserPublic[] = [];
  searchTimeout?: NodeJS.Timeout;
  searching = false;

  _searchText: string = "";
  get searchText() {
    return this._searchText;
  }
  set searchText(val: string) {
    this._searchText = val;
    this.searchInputChange.emit(val);
  }

  onSearchInputChange(event: any) {
    this.searchText = event.detail.value || "";
    if (!this.searchText) return;

    this.results = [];
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchText.trim() || this.searchText.trim() === "@") return;

    this.searching = true;

    this.searchTimeout = setTimeout(async () => {
      await this.search(this.searchText);
      this.searching = false;
    }, PAUSE_BEFORE_SEARCH);
  }

  async search(input: string) {
    input = input || "";
    const loading = this.loadingService.start();

    const results: UserPublic[] = [];

    const handle = input.startsWith("@") ? input.substring(1) : input;
    const profileResponse = await this.trpcService.handle(
      this.trpcService.trpc.users.getUserProfileByHandle.query({
        handle,
      }),
      {
        404: () => {},
      },
    );
    if (profileResponse) {
      results.push(profileResponse);
    }

    const userResponse = await this.trpcService.handle(
      this.trpcService.trpc.users.getUserProfileByEmail.query({
        email: input,
      }),
      {
        404: () => {},
      },
    );

    if (userResponse) results.push(userResponse);

    this.results = results;

    loading.dismiss();
  }

  selectUser(user: UserPublic) {
    if (this.enableSelectedMode) {
      this.selectedUser = user;
    } else {
      this.results = [];
      this.searchText = "";
      this.searching = false;
    }
    this.selectedUserChange.emit(user);
  }

  clearSelectedUser() {
    this.selectedUser = undefined;
    this.selectedUserChange.emit(undefined);
    this.results = [];
    this.searchText = "";
    this.searching = false;
  }

  userTrackBy(index: number, user: UserPublic) {
    return user.id;
  }

  getFirstProfileImage(user: UserPublic) {
    let firstImage: UserPublic["profileImages"][0] | undefined;

    for (const image of user.profileImages) {
      if (!firstImage) firstImage = image;
      else if (firstImage.order > image.order) firstImage = image;
    }

    return firstImage;
  }
}
