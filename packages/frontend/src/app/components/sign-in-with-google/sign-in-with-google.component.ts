import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { TRPCService } from "../../services/trpc.service";
import {
  GOOGLE_GSI_CLIENT_ID,
  IS_SELFHOST,
} from "@recipesage/frontend/src/environments/environment";

const getGoogleRef = () => {
  return (window as any).google;
};

@Component({
  selector: "sign-in-with-google",
  templateUrl: "sign-in-with-google.component.html",
  styleUrls: ["./sign-in-with-google.component.scss"],
})
export class SignInWithGoogleComponent {
  // Can be use to hide the button and only use for prompting
  @Input() showButton = true;
  @Input() autoPrompt = false;

  @Output() signInComplete = new EventEmitter<string>();

  @ViewChild("googleButtonContainer", { static: true })
  googleButtonContainer!: ElementRef<HTMLDivElement>;

  constructor(private trpcService: TRPCService) {}

  ngAfterViewInit() {
    if (IS_SELFHOST) return;

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

  async afterSignInComplete(args: any) {
    const session = await this.trpcService.handle(
      this.trpcService.trpc.users.signInWithGoogle.mutate(args),
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
