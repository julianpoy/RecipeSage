import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { TRPCService } from "../../services/trpc.service";

const getGoogleRef = () => {
  return (window as any).google;
};

@Component({
  selector: "sign-in-with-google",
  templateUrl: "sign-in-with-google.component.html",
  styleUrls: ["./sign-in-with-google.component.scss"],
})
export class SignInWithGoogleComponent {
  @Output() signInComplete = new EventEmitter<string>();

  constructor(private trpcService: TRPCService) {}

  ngAfterViewInit() {
    const googleScriptNodeId = "google-auth-script";
    const existingNode = document.getElementById(googleScriptNodeId);
    if (!existingNode) {
      const googleScriptNode = document.createElement("script");
      googleScriptNode.src = "https://accounts.google.com/gsi/client";
      googleScriptNode.async = true;
      googleScriptNode.id = googleScriptNodeId;
      googleScriptNode.addEventListener("load", () => {
        this.initializeGoogleAccounts();
      });
      document.head.appendChild(googleScriptNode);
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
    (window as any).ref = getGoogleRef()?.accounts.id.initialize({
      client_id:
        "1064631313987-elks4csl9vdtes5j9b5l3savje7m3nhf.apps.googleusercontent.com",
      context: "signin",
      ux_mode: "popup",
      callback: this.afterSignInComplete.bind(this),
      auto_prompt: "false",
    });
  }

  showGoogleAuthPrompt() {
    getGoogleRef()?.accounts.id.prompt();
  }
}
