import { Component } from '@angular/core';

@Component({
  selector: 'page-download-and-install',
  templateUrl: 'download-and-install.page.html',
  styleUrls: ['download-and-install.page.scss']
})
export class DownloadAndInstallPage {
  showAndroid = false;
  showIOS = false;
  showDesktop = false;

  constructor() {
    if (window.pwaPromptInterval) clearInterval(window.pwaPromptInterval);
    window.pwaPromptInterval = setInterval(() => {
      this.pwaPromptCapable()
    }, 1000);
  }

  toggleAndroid() {
    this.showAndroid = !this.showAndroid;
  }

  toggleIOS() {
    this.showIOS = !this.showIOS;
  }

  toggleDesktop() {
    this.showDesktop = !this.showDesktop;
  }

  pwaPromptCapable() {
    return !!(window as any).deferredInstallPrompt;
  }

  showPWAPrompt() {
    const installPrompt = (window as any).deferredInstallPrompt;
    if (installPrompt) {
      installPrompt.prompt();

      installPrompt.userChoice
      .then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
          (window as any).deferredInstallPrompt = null;
        } else {
          console.log('User dismissed the A2HS prompt');
        }
      });
    }
  }
}
