import { AfterViewInit, Component, Input } from "@angular/core";

@Component({
  selector: "copy-with-webshare",
  templateUrl: "copy-with-webshare.component.html",
  styleUrls: ["./copy-with-webshare.component.scss"],
})
export class CopyWithWebshareComponent implements AfterViewInit {
  @Input() webshareTitle?: string;
  @Input() webshareText?: string;
  @Input() webshareURL?: string;
  @Input({
    required: true,
  })
  copyText!: string;

  @Input() disableWebshare: boolean = false;

  hasCopyAPI: boolean = !!document.execCommand;
  hasWebShareAPI: boolean = !!(navigator as any).share;

  constructor() {}

  ngAfterViewInit(): void {
    this.hasWebShareAPI = this.hasWebShareAPI && !this.disableWebshare;
  }

  async webShare() {
    if (this.hasWebShareAPI) {
      try {
        await navigator.share({
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
      "codeBlockCopy",
    ) as HTMLTextAreaElement;

    copyText.select();

    document.execCommand("copy");
  }
}
