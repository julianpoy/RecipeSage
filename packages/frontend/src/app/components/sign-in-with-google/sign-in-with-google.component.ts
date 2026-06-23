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
import { IonButton } from "@ionic/angular/standalone";
import { getElectronAPI, getIsElectron } from "../../utils/electron";
import { getBase } from "../../utils/getBase";

const getGoogleRef = () => {
  return (window as any).google;
};

@Component({
  standalone: true,
  selector: "sign-in-with-google",
  templateUrl: "sign-in-with-google.component.html",
  styleUrls: ["./sign-in-with-google.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonButton],
})
export class SignInWithGoogleComponent implements AfterViewInit, OnDestroy {
  private serverActionsService = inject(ServerActionsService);

  // Can be use to hide the button and only use for prompting
  @Input() showButton = true;
  @Input() autoPrompt = false;
  @Input() allowRegistration = false;

  @Output() signInComplete = new EventEmitter<SessionDTO>();
  @Output() accountNotFound = new EventEmitter<void>();

  @ViewChild("googleButtonContainer", { static: true })
  googleButtonContainer!: ElementRef<HTMLDivElement>;

  isElectron = getIsElectron();

  private removeAuthCodeListener?: () => void;

  ngAfterViewInit() {
    if (IS_SELFHOST) return;

    if (this.isElectron) {
      this.removeAuthCodeListener = getElectronAPI()?.onAuthCode((code) =>
        this.afterDesktopSignInComplete(code),
      );
      return;
    }

    const googleScriptNodeId = "google-auth-script";
    const existingNode = document.getElementById(googleScriptNodeId);
    if (!existingNode) {
      const googleScriptNode = document.createElement("script");
      googleScriptNode.src = "https://accounts.google.com/gsi/client";
      googleScriptNode.async = true;
      googleScriptNode.id = googleScriptNodeId;
      googleScriptNode.addEventListener("load", () => {
        this.initializeGoogleAccounts();
        if (this.showButton) this.renderGoogleButton();
        if (this.autoPrompt) this.showGoogleAuthPrompt();
      });
      document.head.appendChild(googleScriptNode);
    } else {
      if (this.showButton) this.renderGoogleButton();
      if (this.autoPrompt) this.showGoogleAuthPrompt();
    }
  }

  ngOnDestroy() {
    this.removeAuthCodeListener?.();
  }

  startDesktopGoogleSignIn() {
    window.open(
      `${getBase()}auth/desktop-google?allowRegistration=${this.allowRegistration}`,
    );
  }

  async afterDesktopSignInComplete(code: string) {
    const session =
      await this.serverActionsService.users.signInWithDesktopGoogle(
        {
          code,
        },
        {
          404: () => this.accountNotFound.emit(),
        },
      );

    if (session) {
      this.signInComplete.emit(session);
    }
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
    getGoogleRef().accounts.id.renderButton(
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
