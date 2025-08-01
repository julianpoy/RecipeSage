import { Component, Input, type OnInit, inject } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { UserService } from "~/services/user.service";
import { RouteMap } from "~/services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";

@Component({
  selector: "page-share-profile-modal",
  templateUrl: "share-profile-modal.page.html",
  styleUrls: ["share-profile-modal.page.scss"],
  imports: [...SHARED_UI_IMPORTS, CopyWithWebshareComponent],
})
export class ShareProfileModalPage implements OnInit {
  private translate = inject(TranslateService);
  private userService = inject(UserService);
  private modalCtrl = inject(ModalController);

  @Input() handle!: string;
  @Input() userId!: string;
  @Input() profile!: any;

  profileUrl?: string;

  constructor() {
    setTimeout(() => {
      if (this.handle) this.loadFromHandle(this.handle);
      if (this.userId) this.loadFromUserId(this.userId);
      if (this.profile) {
        this.profileUrl = this.getProfileUrl();
      }
    });
  }

  ngOnInit() {
    this.handle = "";
  }

  async loadFromHandle(handle: string) {
    this.profile = await this.userService.getProfileByHandle(handle);
    this.profileUrl = this.getProfileUrl();
  }

  async loadFromUserId(userId: string) {
    this.profile = await this.userService.getProfileByUserId(userId);
    this.profileUrl = this.getProfileUrl();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  getProfileUrl() {
    if (!this.profile) return "Error loading profile url";
    return `https://${window.location.host}/#/${RouteMap.ProfilePage.getPath(
      `@${this.profile.handle}`,
    )}`;
  }

  openFacebook() {
    const win = window.open() as any;
    win.opener = null;
    win.location = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      this.getProfileUrl(),
    )}`;
  }

  async openTwitter() {
    const message = await this.translate
      .get("pages.shareProfileModal.shareTitle", { name: this.profile.name })
      .toPromise();

    const win = window.open() as any;
    win.opener = null;
    win.location = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      this.getProfileUrl(),
    )}&text=${encodeURIComponent(message)}`;
  }

  async openPinterest() {
    const message = await this.translate
      .get("pages.shareProfileModal.shareTitle", { name: this.profile.name })
      .toPromise();

    const imageUrl = encodeURIComponent(
      this.profile.profileImages?.[0]?.location || "",
    );
    const url = encodeURIComponent(this.getProfileUrl());
    const win = window.open() as any;
    win.opener = null;
    win.location = `https://pinterest.com/pin/create/button/?url=${url}&media=${imageUrl}&description=${encodeURIComponent(
      message,
    )}`;
  }

  async openEmail() {
    const subject = await this.translate
      .get("pages.shareProfileModal.shareTitle", { name: this.profile.name })
      .toPromise();
    const message = await this.translate
      .get("pages.shareProfileModal.shareBody", { name: this.profile.name })
      .toPromise();
    const url = encodeURIComponent(` ${this.getProfileUrl()}`);

    const win = window.open() as any;
    win.opener = null;
    win.location = `mailto:info@example.com?&subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(message)}${url}`;
  }
}
