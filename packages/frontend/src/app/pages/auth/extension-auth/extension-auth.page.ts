import { Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController } from "@ionic/angular/standalone";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonButton,
} from "@ionic/angular/standalone";
import type { SessionDTO } from "@recipesage/prisma";

import { IS_SELFHOST } from "../../../../environments/environment";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { LogoIconComponent } from "../../../components/logo-icon/logo-icon.component";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import { AuthType, RouteMap } from "../../../services/util.service";

const OFFICIAL_REDIRECT_URI_PREFIXES = [
  "https://oepplnnfceidfaaacjpdpobnjkcpgcpo.chromiumapp.org/",
];

function isValidExtensionRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "moz-extension:") return true;
    if (url.protocol === "https:") {
      if (url.hostname.endsWith(".chromiumapp.org")) return true;
      if (url.hostname.endsWith(".extensions.allizom.org")) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isOfficialRedirectUri(value: string): boolean {
  return OFFICIAL_REDIRECT_URI_PREFIXES.some((prefix) =>
    value.startsWith(prefix),
  );
}

@Component({
  standalone: true,
  selector: "page-extension-auth",
  templateUrl: "./extension-auth.page.html",
  styleUrls: ["./extension-auth.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    LogoIconComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonButton,
  ],
})
export class ExtensionAuthPage {
  private route = inject(ActivatedRoute);
  private navCtrl = inject(NavController);

  isSelfHost = IS_SELFHOST;

  invalidRequest = false;

  redirectUri?: string;
  state?: string;

  existingSession?: SessionDTO;
  isOfficial = false;

  loadingSession = true;

  constructor() {
    const redirectUri =
      this.route.snapshot.queryParamMap.get("redirect_uri") || "";
    const state = this.route.snapshot.queryParamMap.get("state") || "";
    if (!redirectUri || !state || !isValidExtensionRedirectUri(redirectUri)) {
      this.invalidRequest = true;
    } else {
      this.redirectUri = redirectUri;
      this.state = state;
      this.isOfficial = isOfficialRedirectUri(redirectUri);
    }
  }

  async ionViewWillEnter() {
    if (this.invalidRequest) {
      this.loadingSession = false;
      return;
    }
    const session = await appIdbStorageManager.getSession();
    if (!session) {
      this.redirectToLogin();
      return;
    }
    if (this.isOfficial) {
      this.handoff(session.token);
      return;
    }
    this.existingSession = session;
    this.loadingSession = false;
  }

  async useDifferentAccount() {
    this.loadingSession = true;
    localStorage.removeItem("token");
    await appIdbStorageManager.deleteAllData();
    this.existingSession = undefined;
    this.redirectToLogin();
  }

  continueWithSession() {
    if (!this.existingSession) return;
    this.handoff(this.existingSession.token);
  }

  private currentReturnPath(): string {
    return `/auth/extension?redirect_uri=${encodeURIComponent(
      this.redirectUri || "",
    )}&state=${encodeURIComponent(this.state || "")}`;
  }

  private redirectToLogin() {
    const loginPath = RouteMap.AuthPage.getPath(AuthType.Login);
    const target = `${loginPath}?redirect=${encodeURIComponent(
      this.currentReturnPath(),
    )}`;
    this.navCtrl.navigateRoot(target);
  }

  private handoff(token: string) {
    if (!this.redirectUri || !this.state) return;
    const url = `${this.redirectUri}#token=${encodeURIComponent(
      token,
    )}&state=${encodeURIComponent(this.state)}`;
    window.location.replace(url);
  }
}
