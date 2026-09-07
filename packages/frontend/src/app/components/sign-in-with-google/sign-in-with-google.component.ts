import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  type AfterViewInit,
  type OnDestroy,
  inject,
} from "@angular/core";
import { ServerActionsService } from "../../services/server-actions.service";
import {
  GOOGLE_GSI_CLIENT_ID,
  IS_SELFHOST,
} from "@recipesage/frontend/src/environments/environment";
import type { SessionDTO } from "@recipesage/prisma";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { IonButton, ToastController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import { getElectronAPI, getIsElectron } from "../../utils/electron";
import { serverConfig } from "../../utils/serverConfig";
import { SSO_PENDING_PROVIDER_KEY } from "../../utils/ssoRedirect";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const getGoogleRef = () => {
  return (window as any).google;
};

const PKCE_VERIFIER_STORAGE_KEY = "googleSignInPkceVerifier";

@Component({
  standalone: true,
  selector: "sign-in-with-google",
  templateUrl: "sign-in-with-google.component.html",
  styleUrls: ["./sign-in-with-google.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonButton],
})
export class SignInWithGoogleComponent implements AfterViewInit, OnDestroy {
  private serverActionsService = inject(ServerActionsService);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);

  // Can be use to hide the button and only use for prompting
  @Input() showButton = true;
  @Input() autoPrompt = false;
  @Input() allowRegistration = false;

  @Output() signInComplete = new EventEmitter<SessionDTO>();
  @Output() accountNotFound = new EventEmitter<void>();

  @ViewChild("googleButtonContainer", { static: true })
  googleButtonContainer!: ElementRef<HTMLDivElement>;

  isElectron = getIsElectron();
  isNative = Capacitor.isNativePlatform();

  private removeAuthCodeListener?: () => void;
  private removeGoogleScriptLoadListener?: () => void;
  private nativeAuthListener?: PluginListenerHandle;

  ngAfterViewInit() {
    if (IS_SELFHOST) return;

    if (this.isElectron) {
      this.removeAuthCodeListener = getElectronAPI()?.onAuthCode((code) =>
        this.afterDesktopSignInComplete(code),
      );
      return;
    }

    if (this.isNative) {
      void this.registerNativeAuthListener();
      return;
    }

    const onGoogleReady = () => {
      this.initializeGoogleAccounts();
      if (this.showButton) this.renderGoogleButton();
      if (this.autoPrompt) this.showGoogleAuthPrompt();
    };

    if (getGoogleRef()?.accounts) {
      onGoogleReady();
      return;
    }

    const googleScriptNodeId = "google-auth-script";
    const existingNode = document.getElementById(googleScriptNodeId);
    if (existingNode) {
      existingNode.addEventListener("load", onGoogleReady);
      this.removeGoogleScriptLoadListener = () =>
        existingNode.removeEventListener("load", onGoogleReady);
      return;
    }

    const googleScriptNode = document.createElement("script");
    googleScriptNode.src = "https://accounts.google.com/gsi/client";
    googleScriptNode.async = true;
    googleScriptNode.id = googleScriptNodeId;
    googleScriptNode.addEventListener("load", onGoogleReady);
    this.removeGoogleScriptLoadListener = () =>
      googleScriptNode.removeEventListener("load", onGoogleReady);
    document.head.appendChild(googleScriptNode);
  }

  ngOnDestroy() {
    this.removeAuthCodeListener?.();
    this.removeGoogleScriptLoadListener?.();
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
      if (code) void this.afterDesktopSignInComplete(code);
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

  async startExternalGoogleSignIn() {
    const codeChallenge = await this.generatePkceChallenge();
    localStorage.setItem(SSO_PENDING_PROVIDER_KEY, "google");
    const url = `${serverConfig.apiBase}auth/redirect-google?allowRegistration=${this.allowRegistration}&codeChallenge=${encodeURIComponent(codeChallenge)}`;
    if (this.isNative) {
      void Browser.open({ url });
      return;
    }
    window.open(url);
  }

  async afterDesktopSignInComplete(code: string) {
    if (localStorage.getItem(SSO_PENDING_PROVIDER_KEY) !== "google") return;
    localStorage.removeItem(SSO_PENDING_PROVIDER_KEY);

    const codeVerifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!codeVerifier) {
      await this.presentSignInInterrupted();
      return;
    }

    const session =
      await this.serverActionsService.users.signInWithRedirectGoogle(
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
      .get("components.signInWithGoogle.interrupted")
      .toPromise();
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    await toast.present();
  }

  async afterSignInComplete(args: any) {
    const session = await this.serverActionsService.users.signInWithGoogle(
      {
        ...args,
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

  initializeGoogleAccounts() {
    getGoogleRef()?.accounts.id.initialize({
      client_id: GOOGLE_GSI_CLIENT_ID,
      context: "signin",
      ux_mode: "popup",
      callback: this.afterSignInComplete.bind(this),
      auto_prompt: "false",
    });
  }

  showGoogleAuthPrompt() {
    getGoogleRef()?.accounts.id.prompt();
  }

  renderGoogleButton() {
    getGoogleRef()?.accounts.id.renderButton(
      this.googleButtonContainer.nativeElement,
      {
        type: "standard",
        shape: "rectangular",
        theme: "filled_black",
        text: "continue_with",
        size: "large",
        logo_alignment: "left",
      },
    );
  }
}
