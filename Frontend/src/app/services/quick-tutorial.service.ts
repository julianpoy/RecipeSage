import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular';

interface QuickTutorialBlurb {
  header: string;
  subHeader?: string;
  message: string;
}

// Mapped values of these enums are stored in client localStorage.
// Changing mapped value names here will reset their viewed status
export enum QuickTutorialOptions {
  MultipleRecipeSelection = 'multipleRecipeSelection',
  MultipleLabelSelection = 'multipleLabelSelection',
  SplitPaneView = 'splitPaneView'
}

type QuickTutorialBlurbs = {
  [ s in QuickTutorialOptions ]: QuickTutorialBlurb
};

const quickTutorialBlurbs: QuickTutorialBlurbs = {
  [QuickTutorialOptions.MultipleRecipeSelection]: {
    header: 'Multiple Recipe Selection',
    message: `You're now in multiple recipe selection mode.<br /><br />
              You can click as many recipes as you'd like to select,
              then use the buttons that appear in the header to take bulk actions such as labelling or deleting.<br /><br />
              You can exit multiple recipe selection mode at any time by clicking the X in the header, or via the options menu.`
  },
  [QuickTutorialOptions.MultipleLabelSelection]: {
    header: 'Multiple Label Selection',
    message: `You're now in multiple label selection mode.<br /><br />
              You can click as many labels as you'd like to select,
              then use the buttons that appear in the header to take bulk actions.<br /><br />
              You can exit multiple label selection mode at any time by clicking the X in the header, or via the options menu.`
  },
  [QuickTutorialOptions.SplitPaneView]: {
    header: 'Split Pane View',
    message: `Split pane view is only visible on devices with large screens (laptops, large tablets, etc).<br /><br />
              When split pane view is enabled, the side menu will always be visible.<br /><br />
              This feature is useful for optimizing the experience on larger devices.`
  }
};

const TUTORIAL_LOCALSTORAGE_KEY = 'seenQuickTutorialOptions';

@Injectable({
  providedIn: 'root'
})
export class QuickTutorialService {
  constructor(private alertCtrl: AlertController) { }

  private fetchSeenTutorials(): any[] {
    try {
      const seenTutorials = localStorage.getItem(TUTORIAL_LOCALSTORAGE_KEY);
      if (!seenTutorials) return [];
      return JSON.parse(seenTutorials);
    } catch (e) {
      return [];
    }
  }

  private saveSeenTutorials(seenTutorials) {
    try {
      const serialized = JSON.stringify(seenTutorials);
      localStorage.setItem(TUTORIAL_LOCALSTORAGE_KEY, serialized);
    } catch (e) {}
  }

  private markQuickTutorialAsSeen(quickTutorialKey: QuickTutorialOptions) {
    const seenTutorials = this.fetchSeenTutorials();
    seenTutorials.push(quickTutorialKey);

    this.saveSeenTutorials(seenTutorials);
  }

  async triggerQuickTutorial(quickTutorialKey: QuickTutorialOptions) {
    const seenTutorials = this.fetchSeenTutorials();

    if (seenTutorials.indexOf(quickTutorialKey) < 0) {
      const tutorial = quickTutorialBlurbs[quickTutorialKey];

      const tutorialAlert = await this.alertCtrl.create({
        header: tutorial.header,
        subHeader: tutorial.subHeader,
        message: tutorial.message,
        buttons: ['Okay']
      });

      tutorialAlert.onDidDismiss().then(() => {
        this.markQuickTutorialAsSeen(quickTutorialKey);
      });

      await tutorialAlert.present();
    }
  }
}
