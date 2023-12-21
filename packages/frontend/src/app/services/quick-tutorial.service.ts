import { Injectable } from "@angular/core";
import { AlertController } from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

interface QuickTutorialBlurb {
  header: string;
  message: string;
}

// Mapped values of these enums are stored in client localStorage.
// Changing mapped value names here will reset their viewed status
export enum QuickTutorialOptions {
  MultipleRecipeSelection = "multipleRecipeSelection",
  MultipleLabelSelection = "multipleLabelSelection",
  SplitPaneView = "splitPaneView",
  ExperimentalOfflineCache = "experimentalOfflineCache",
  PinnedRecipes = "pinnedRecipes",
}

type QuickTutorialBlurbs = {
  [s in QuickTutorialOptions]: QuickTutorialBlurb;
};

const quickTutorialBlurbs: QuickTutorialBlurbs = {
  [QuickTutorialOptions.MultipleRecipeSelection]: {
    header: "services.quickTutorial.multipleRecipeSelection.header",
    message: "services.quickTutorial.multipleRecipeSelection.message",
  },
  [QuickTutorialOptions.MultipleLabelSelection]: {
    header: "services.quickTutorial.multipleLabelSelection.header",
    message: "services.quickTutorial.multipleLabelSelection.message",
  },
  [QuickTutorialOptions.SplitPaneView]: {
    header: "services.quickTutorial.splitPaneView.header",
    message: "services.quickTutorial.splitPaneView.message",
  },
  [QuickTutorialOptions.ExperimentalOfflineCache]: {
    header: "services.quickTutorial.experimentalOfflineCache.header",
    message: "services.quickTutorial.experimentalOfflineCache.message",
  },
  [QuickTutorialOptions.PinnedRecipes]: {
    header: "services.quickTutorial.pinnedRecipes.header",
    message: "services.quickTutorial.pinnedRecipes.message",
  },
};

const TUTORIAL_LOCALSTORAGE_KEY = "seenQuickTutorialOptions";

@Injectable({
  providedIn: "root",
})
export class QuickTutorialService {
  constructor(
    private alertCtrl: AlertController,
    private translate: TranslateService,
  ) {}

  private fetchSeenTutorials(): QuickTutorialOptions[] {
    try {
      const seenTutorials = localStorage.getItem(TUTORIAL_LOCALSTORAGE_KEY);
      if (!seenTutorials) return [];
      return JSON.parse(seenTutorials);
    } catch (e) {
      return [];
    }
  }

  private saveSeenTutorials(seenTutorials: QuickTutorialOptions[]) {
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

      const header = await this.translate.get(tutorial.header).toPromise();
      const message = await this.translate.get(tutorial.message).toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const tutorialAlert = await this.alertCtrl.create({
        header,
        message,
        buttons: [okay],
      });

      await tutorialAlert.present();

      await tutorialAlert.onDidDismiss();

      this.markQuickTutorialAsSeen(quickTutorialKey);
    }
  }
}
