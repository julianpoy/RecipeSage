import {
  Component,
  Input,
  Output,
  EventEmitter,
  type OnInit,
  type OnDestroy,
  inject,
} from "@angular/core";
import { ServerActionsService } from "../../services/server-actions.service";
import {
  APPLE_SIGN_IN_SERVICES_ID,
  IS_SELFHOST,
} from "@recipesage/frontend/src/environments/environment";
import type { SessionDTO } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonButton, IonIcon, ToastController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { addIcons } from "ionicons";
import { logoApple } from "ionicons/icons";
import { getElectronAPI, getIsElectron } from "../../utils/electron";
import { serverConfig } from "../../utils/serverConfig";
import { SSO_PENDING_PROVIDER_KEY } from "../../utils/ssoRedirect";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { AppleSignIn, SignInScope } from "@capawesome/capacitor-apple-sign-in";

const getAppleRef = () => {
  return (window as any).AppleID;
};

const PKCE_VERIFIER_STORAGE_KEY = "appleSignInPkceVerifier";

@Component({
  standalone: true,
  selector: "sign-in-with-apple",
  templateUrl: "sign-in-with-apple.component.html",
  styleUrls: ["./sign-in-with-apple.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonButton, IonIcon],
})
export class SignInWithAppleComponent implements OnInit, OnDestroy {
  private serverActionsService = inject(ServerActionsService);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);

  @Input() allowRegistration = false;

  @Output() signInComplete = new EventEmitter<SessionDTO>();
  @Output() accountNotFound = new EventEmitter<void>();

  isSelfHost = IS_SELFHOST;
  isElectron = getIsElectron();
  isNative = Capacitor.isNativePlatform();
  isIos = Capacitor.getPlatform() === "ios";

  private removeAuthCodeListener?: () => void;
  private removeAppleScriptLoadListener?: () => void;
  private nativeAuthListener?: PluginListenerHandle;

  constructor() {
    addIcons({ logoApple });
  }

  ngOnInit() {
    if (IS_SELFHOST) return;

    if (this.isElectron) {
      this.removeAuthCodeListener = getElectronAPI()?.onAuthCode((code) =>
        this.afterRedirectSignInComplete(code),
      );
      return;
    }

    if (this.isNative) {
      void this.registerNativeAuthListener();
      return;
    }

    const onAppleReady = () => this.initAppleJs();

    if (getAppleRef()) {
      onAppleReady();
      return;
    }

    const appleScriptNodeId = "apple-auth-script";
    const existingNode = document.getElementById(appleScriptNodeId);
    if (existingNode) {
      existingNode.addEventListener("load", onAppleReady);
      this.removeAppleScriptLoadListener = () =>
        existingNode.removeEventListener("load", onAppleReady);
      return;
    }

    const appleScriptNode = document.createElement("script");
    appleScriptNode.src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    appleScriptNode.async = true;
    appleScriptNode.id = appleScriptNodeId;
    appleScriptNode.addEventListener("load", onAppleReady);
    this.removeAppleScriptLoadListener = () =>
      appleScriptNode.removeEventListener("load", onAppleReady);
    document.head.appendChild(appleScriptNode);
  }

  ngOnDestroy() {
    this.removeAuthCodeListener?.();
    this.removeAppleScriptLoadListener?.();
    void this.nativeAuthListener?.remove();
  }

  private async registerNativeAuthListener() {
    this.nativeAuthListener = await App.addListener("appUrlOpen", (event) => {
      let url: URL;
      try {
        url = new URL(event.url);
      } catch {
        return;
      }
      if (url.protocol !== "recipesage:") return;

      const code = url.searchParams.get("code");
      void Browser.close();
      if (code) void this.afterRedirectSignInComplete(code);
    });
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  private async generatePkceChallenge(): Promise<string> {
    let verifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!verifier) {
      verifier = this.base64UrlEncode(
        crypto.getRandomValues(new Uint8Array(32)),
      );
      localStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, verifier);
    }

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    );
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  onAppleButtonClick() {
    if (this.isIos) {
      void this.startNativeAppleSignIn();
      return;
    }
    if (this.isNative || this.isElectron) {
      void this.startExternalAppleSignIn();
      return;
    }
    void this.startWebAppleSignIn();
  }

  private extractName(user?: {
    name?: { firstName?: string; lastName?: string };
  }): string | undefined {
    const fullName = [user?.name?.firstName, user?.name?.lastName]
      .filter((part): part is string => !!part)
      .join(" ");
    return fullName || undefined;
  }

  async startNativeAppleSignIn() {
    const nonce = this.base64UrlEncode(
      crypto.getRandomValues(new Uint8Array(32)),
    );
    try {
      const result = await AppleSignIn.signIn({
        scopes: [SignInScope.Email, SignInScope.FullName],
        nonce,
      });
      const identityToken = result.idToken;
      if (!identityToken) return;
      const name = [result.givenName, result.familyName]
        .filter((part): part is string => !!part)
        .join(" ");
      await this.afterIdentityToken(identityToken, nonce, name || undefined);
    } catch (error) {
      if (this.isUserCancellation(error)) return;
      await this.presentSignInFailed();
    }
  }

  async startWebAppleSignIn() {
    try {
      const data = await getAppleRef()?.auth.signIn();
      const identityToken = data?.authorization?.id_token;
      if (!identityToken) return;
      await this.afterIdentityToken(
        identityToken,
        undefined,
        this.extractName(data?.user),
      );
    } catch (error) {
      if (this.isUserCancellation(error)) return;
      await this.presentSignInFailed();
    }
  }

  private isUserCancellation(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    return "code" in error && error.code === "SIGN_IN_CANCELED";
  }

  async startExternalAppleSignIn() {
    const codeChallenge = await this.generatePkceChallenge();
    localStorage.setItem(SSO_PENDING_PROVIDER_KEY, "apple");
    const url = `${serverConfig.apiBase}auth/redirect-apple?allowRegistration=${this.allowRegistration}&codeChallenge=${encodeURIComponent(codeChallenge)}`;
    if (this.isNative) {
      void Browser.open({ url });
      return;
    }
    window.open(url);
  }

  private initAppleJs() {
    getAppleRef()?.auth.init({
      clientId: APPLE_SIGN_IN_SERVICES_ID,
      scope: "name email",
      redirectURI: self.location.origin,
      usePopup: true,
    });
  }

  private async afterIdentityToken(
    identityToken: string,
    nonce: string | undefined,
    name: string | undefined,
  ) {
    const session = await this.serverActionsService.users.signInWithApple(
      {
        identityToken,
        nonce,
        name,
        allowRegistration: this.allowRegistration,
      },
      {
        404: () => this.accountNotFound.emit(),
      },
    );

    if (session) {
      this.signInComplete.emit(session);
    }
  }

  private async afterRedirectSignInComplete(code: string) {
    if (localStorage.getItem(SSO_PENDING_PROVIDER_KEY) !== "apple") return;
    localStorage.removeItem(SSO_PENDING_PROVIDER_KEY);

    const codeVerifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!codeVerifier) {
      await this.presentSignInInterrupted();
      return;
    }

    const session =
      await this.serverActionsService.users.signInWithRedirectApple(
        {
          code,
          codeVerifier,
        },
        {
          404: () => this.accountNotFound.emit(),
        },
      );

    if (session) {
      this.signInComplete.emit(session);
    }
  }

  private async presentSignInInterrupted() {
    const message = await this.translate
      .get("components.signInWithApple.interrupted")
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    await toast.present();
  }

  private async presentSignInFailed() {
    const message = await this.translate
      .get("components.signInWithApple.failed")
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    await toast.present();
  }
}
