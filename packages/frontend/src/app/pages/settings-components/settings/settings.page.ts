import { Component } from "@angular/core";
import {
  NavController,
  ToastController,
  AlertController,
  LoadingController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap, UtilService } from "~/services/util.service";
import {
  PreferencesService,
  GlobalPreferenceKey,
  SupportedLanguages,
} from "~/services/preferences.service";
import {
  FeatureFlagService,
  FeatureFlagKeys,
} from "~/services/feature-flag.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "~/services/quick-tutorial.service";
import { OfflineCacheService } from "~/services/offline-cache.service";
import { FontSizeModalComponent } from "../../../components/font-size-modal/font-size-modal.component";

const APP_THEME_LOCALSTORAGE_KEY = "theme";

@Component({
  selector: "page-settings",
  templateUrl: "settings.page.html",
  styleUrls: ["settings.page.scss"],
})
export class SettingsPage {
  appTheme = localStorage.getItem(APP_THEME_LOCALSTORAGE_KEY) || "default";

  preferences = this.preferencesService.preferences;
  preferenceKeys = GlobalPreferenceKey;

  featureFlags = this.featureFlagService.flags;
  featureFlagKeys = FeatureFlagKeys;

  showSplitPaneOption = false;

  language: SupportedLanguages | "navigator" =
    this.preferences[GlobalPreferenceKey.Language] || "navigator";
  languageOptions: [SupportedLanguages, string][] = [];
  languageSelectInterfaceOptions = {};

  fontSize = this.preferences[GlobalPreferenceKey.FontSize];

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public toastCtrl: ToastController,
    public alertCtrl: AlertController,
    public modalCtrl: ModalController,
    public loadingCtrl: LoadingController,
    public utilService: UtilService,
    public offlineCacheService: OfflineCacheService,
    public preferencesService: PreferencesService,
    public featureFlagService: FeatureFlagService,
    public quickTutorialService: QuickTutorialService
  ) {
    try {
      this.showSplitPaneOption = screen.width >= 1200;
    } catch (e) {
      console.error("Could not get screen width", e);
    }

    try {
      const locale = new Intl.DisplayNames(window.navigator.languages, {
        type: "language",
      });

      this.languageOptions = Object.values(SupportedLanguages).map((code) => [
        code,
        locale.of(code) || code,
      ]);
    } catch (e) {
      console.error("Intl not supported");
      this.languageOptions = Object.values(SupportedLanguages).map((code) => [
        code,
        code,
      ]);
    }

    (async () => {
      this.languageSelectInterfaceOptions = {
        header: await this.translate.get("pages.settings.language").toPromise(),
      };
    })();
  }

  savePreferences() {
    this.preferencesService.save();
  }

  toggleSplitPane() {
    if (this.preferences[GlobalPreferenceKey.EnableSplitPane]) {
      this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.SplitPaneView
      );
    }
  }

  async toggleOfflineCache() {
    if (this.preferences[GlobalPreferenceKey.EnableExperimentalOfflineCache]) {
      const message = await this.translate
        .get("pages.settings.offline.loading")
        .toPromise();

      await this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.ExperimentalOfflineCache
      );
      const loading = await this.loadingCtrl.create({
        message,
      });
      await loading.present();
      try {
        await this.offlineCacheService.fullSync();
      } catch (e) {
        const error = await this.translate
          .get("pages.settings.offline.error")
          .toPromise();
        setTimeout(() => alert(error));
        throw e;
      }
      await loading.dismiss();
    }
  }

  async resetPreferences() {
    const header = await this.translate
      .get("pages.settings.resetPrefs.header")
      .toPromise();
    const message = await this.translate
      .get("pages.settings.resetPrefs.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const del = await this.translate.get("generic.delete").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
        },
        {
          text: del,
          handler: () => {
            localStorage.removeItem(APP_THEME_LOCALSTORAGE_KEY);
            this.preferencesService.resetToDefaults();
          },
        },
      ],
    });

    alert.present();
  }

  languageChanged() {
    const newLang = this.language === "navigator" ? null : this.language;
    this.preferences[GlobalPreferenceKey.Language] = newLang;
    this.preferencesService.save();

    this.translate.use(newLang || this.utilService.getAppBrowserLang());
  }

  fontSizeChanged() {
    this.preferences[GlobalPreferenceKey.FontSize] = this.fontSize;
    this.preferencesService.save();

    this.utilService.setFontSize(this.fontSize);
  }

  async showFontSizePopover() {
    const fontSizeModal = await this.modalCtrl.create({
      component: FontSizeModalComponent,
      componentProps: {
        fontSize: this.fontSize,
      },
    });

    await fontSizeModal.present();

    const { data } = await fontSizeModal.onDidDismiss();
    if (!data) return;

    this.fontSize = data.fontSize;

    this.fontSizeChanged();
  }

  private applyAppTheme() {
    // Change in localStorage
    localStorage.setItem(APP_THEME_LOCALSTORAGE_KEY, this.appTheme);

    // Change in current session
    const bodyClasses = document.body.className.replace(/theme-\S*/, "");
    document.body.className = `${bodyClasses} theme-${this.appTheme}`;
  }

  async appThemeChanged() {
    if (this.appTheme === "black") {
      const header = await this.translate
        .get("pages.settings.oled.header")
        .toPromise();
      const message = await this.translate
        .get("pages.settings.oled.message")
        .toPromise();
      const cancel = await this.translate.get("generic.cancel").toPromise();
      const okay = await this.translate.get("generic.okay").toPromise();

      const alert = await this.alertCtrl.create({
        header,
        message,
        buttons: [
          {
            text: cancel,
            handler: () => {
              this.appTheme = "default";
            },
          },
          {
            text: okay,
            handler: () => {
              this.applyAppTheme();
            },
          },
        ],
      });

      alert.present();
    } else {
      this.applyAppTheme();
    }
  }

  goToImport() {
    this.navCtrl.navigateForward(RouteMap.ImportPage.getPath());
  }

  goToExport() {
    this.navCtrl.navigateForward(RouteMap.ExportPage.getPath());
  }

  goToAccount() {
    this.navCtrl.navigateForward(RouteMap.AccountPage.getPath());
  }

  async checkForUpdate() {
    const header = await this.translate
      .get("pages.settings.update.header")
      .toPromise();
    const subHeader = await this.translate
      .get("pages.settings.update.subHeader")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      subHeader,
      buttons: [
        {
          text: cancel,
          handler: () => {},
        },
        {
          text: okay,
          handler: () => {
            try {
              (window as any).forceSWUpdate().then(() => {
                (window as any).location.reload(true);
              });
            } catch (e) {
              (window as any).location.reload(true);
            }
          },
        },
      ],
    });
    alert.present();
  }
}
