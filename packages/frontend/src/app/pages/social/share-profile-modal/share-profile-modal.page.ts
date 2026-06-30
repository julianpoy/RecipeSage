import { Component, Input, type OnInit, inject } from "@angular/core";
import { ModalController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { ServerActionsService } from "../../../services/server-actions.service";
import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { CopyWithWebshareComponent } from "../../../components/copy-with-webshare/copy-with-webshare.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonFooter,
  IonLabel,
} from "@ionic/angular/standalone";
import {
  closeOutline,
  logoFacebook,
  logoPinterest,
  logoTwitter,
  mailOutline,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-share-profile-modal",
  templateUrl: "share-profile-modal.page.html",
  styleUrls: ["share-profile-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    CopyWithWebshareComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonFooter,
    IonLabel,
  ],
})
export class ShareProfileModalPage implements OnInit {
  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);
  private modalCtrl = inject(ModalController);

  @Input() handle!: string;
  @Input() userId!: string;
  @Input() profile!: any;

  profileUrl?: string;

  constructor() {
    addIcons({
      closeOutline,
      logoFacebook,
      logoPinterest,
      logoTwitter,
      mailOutline,
    });
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
    this.profile = await this.serverActionsService.users.getUserProfileByHandle(
      { handle },
    );
    this.profileUrl = this.getProfileUrl();
  }

  async loadFromUserId(userId: string) {
    const profiles = await this.serverActionsService.users.getUserProfilesById({
      ids: [userId],
    });
    this.profile = profiles?.[0];
    this.profileUrl = this.getProfileUrl();
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  getProfileUrl() {
    if (!this.profile)
      return this.translate.instant(
        "pages.shareProfileModal.errorLoadingProfileUrl",
      );
    return `https://${window.location.host}/app/${RouteMap.ProfilePage.getPath(
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
      this.profile.profileImages?.[0]?.image?.location || "",
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
