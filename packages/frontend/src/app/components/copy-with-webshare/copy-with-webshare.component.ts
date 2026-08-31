import { AfterViewInit, Component, Input } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import {
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
} from "@ionic/angular/standalone";
import { copyOutline, shareOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "copy-with-webshare",
  templateUrl: "copy-with-webshare.component.html",
  styleUrls: ["./copy-with-webshare.component.scss"],
  imports: [...SHARED_UI_IMPORTS, IonItem, IonLabel, IonButton, IonIcon],
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

  private isNative = Capacitor.isNativePlatform();
  hasCopyAPI: boolean = this.isNative || !!document.execCommand;
  hasWebShareAPI: boolean = this.isNative || !!navigator.share;

  constructor() {
    addIcons({ copyOutline, shareOutline });
  }

  ngAfterViewInit(): void {
    this.hasWebShareAPI = this.hasWebShareAPI && !this.disableWebshare;
  }

  async webShare() {
    if (!this.hasWebShareAPI) return;

    try {
      if (this.isNative) {
        await Share.share({
          title: this.webshareTitle,
          text: this.webshareText,
          url: this.webshareURL,
        });
        return;
      }

      await navigator.share({
        title: this.webshareTitle,
        text: this.webshareText,
        url: this.webshareURL,
      });
    } catch (e) {
      // Ignore webshare errors
    }
  }

  async clipboard() {
    const copyText = document.getElementById(
      "codeBlockCopy",
    ) as HTMLTextAreaElement;

    if (this.isNative) {
      await Clipboard.write({ string: copyText.value });
      return;
    }

    copyText.select();

    document.execCommand("copy");
  }
}
