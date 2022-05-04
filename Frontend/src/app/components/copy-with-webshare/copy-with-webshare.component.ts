import { Component, Input } from '@angular/core';

@Component({
  selector: 'copy-with-webshare',
  templateUrl: 'copy-with-webshare.component.html',
  styleUrls: ['./copy-with-webshare.scss']
})
export class CopyWithWebshareComponent {
  @Input() webshareTitle: string;
  @Input() webshareText: string;
  @Input() webshareURL: string;
  @Input() copyText: string;

  hasCopyAPI: boolean = !!document.execCommand;
  hasWebShareAPI: boolean = !!navigator.share;

  constructor() {}

  webShare() {
    if (this.hasWebShareAPI) {
      navigator.share({
        title: this.webshareTitle,
        text: this.webshareText,
        url: this.webshareURL,
      });
    }
  }

  clipboard() {
    const copyText = document.getElementById('codeBlockCopy') as HTMLTextAreaElement;

    copyText.select();

    document.execCommand('copy');
  }
}
