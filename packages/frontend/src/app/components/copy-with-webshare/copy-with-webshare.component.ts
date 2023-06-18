import { Component, Input } from "@angular/core";

@Component({
  selector: "copy-with-webshare",
  templateUrl: "copy-with-webshare.component.html",
  styleUrls: ["./copy-with-webshare.component.scss"],
})
export class CopyWithWebshareComponent {
  @Input({
    required: true,
  })
  webshareTitle!: string;
  @Input({
    required: true,
  })
  webshareText!: string;
  @Input({
    required: true,
  })
  webshareURL!: string;
  @Input({
    required: true,
  })
  copyText!: string;

  hasCopyAPI: boolean = !!document.execCommand;
  hasWebShareAPI: boolean = !!(navigator as any).share;

  constructor() {}

  async webShare() {
    if (this.hasWebShareAPI) {
      try {
        (navigator as any).share({
          title: this.webshareTitle,
          text: this.webshareText,
          url: this.webshareURL,
        });
      } catch (e) {
        // Ignore webshare errors
      }
    }
  }

  clipboard() {
    const copyText = document.getElementById(
      "codeBlockCopy"
    ) as HTMLTextAreaElement;

    copyText.select();

    document.execCommand("copy");
  }
}
