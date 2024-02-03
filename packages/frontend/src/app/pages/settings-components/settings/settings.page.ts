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
import { PreferencesService } from "~/services/preferences.service";
import {
  AppTheme,
  GlobalPreferenceKey,
  PreferencesSync,
  SupportedLanguages,
} from "@recipesage/util";
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
import { MessagingService } from "../../../services/messaging.service";
import { UserService } from "../../../services/user.service";

@Component({
  selector: "page-settings",
  templateUrl: "settings.page.html",
  styleUrls: ["settings.page.scss"],
})
export class SettingsPage {
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
  isLoggedIn: boolean = false;

  constructor(
    private navCtrl: NavController,
    private translate: TranslateService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private modalCtrl: ModalController,
    private loadingCtrl: LoadingController,
    private utilService: UtilService,
    private offlineCacheService: OfflineCacheService,
    private preferencesService: PreferencesService,
    private featureFlagService: FeatureFlagService,
    private quickTutorialService: QuickTutorialService,
    private messagingService: MessagingService,
    private userService: UserService,
  ) {
    try {
      this.showSplitPaneOption = screen.width >= 1200;
    } catch (e) {
      console.error("Could not get screen width", e);
    }

    try {
      this.languageOptions = [];
      for (const supportedLanguage of Object.values(SupportedLanguages)) {
        const locale = new Intl.DisplayNames(supportedLanguage, {
          type: "language",
          fallback: "code",
        });

        this.languageOptions.push([
          supportedLanguage,
          locale.of(supportedLanguage) || supportedLanguage,
        ]);
      }
      this.languageOptions = this.languageOptions.sort((a, b) =>
        a[1].localeCompare(b[1]),
      );
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
        cssClass: "language-select-alert",
      };
    })();
  }

  ionViewWillEnter() {
    this.isLoggedIn = this.utilService.isLoggedIn();
  }

  _logout() {
    this.utilService.removeToken();

    this.navCtrl.navigateRoot(RouteMap.WelcomePage.getPath());
  }

  logout() {
    this.messagingService.disableNotifications();

    this.userService.logout({
      "*": () => {},
    });

    this._logout();
  }

  savePreferences() {
    this.preferencesService.save();
  }

  toggleSplitPane() {
    if (this.preferences[GlobalPreferenceKey.EnableSplitPane]) {
      this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.SplitPaneView,
      );
    }
  }

  async togglePreferencesSync(event: any) {
    const value = event.detail.checked
      ? PreferencesSync.Enabled
      : PreferencesSync.Disabled;

    if (value === PreferencesSync.Disabled) {
      this.preferences[GlobalPreferenceKey.PreferencesSync] = value;
      this.preferencesService.save();
      return;
    }

    const header = await this.translate
      .get("pages.settings.preferencesSync.header")
      .toPromise();
    const message = await this.translate
      .get("pages.settings.preferencesSync.message")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const local = await this.translate
      .get("pages.settings.preferencesSync.local")
      .toPromise();
    const remote = await this.translate
      .get("pages.settings.preferencesSync.remote")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          handler: () => {
            window.location.reload();
          },
        },
        {
          text: local,
          handler: () => {
            this.preferences[GlobalPreferenceKey.PreferencesSync] = value;
            this.preferencesService.save();
          },
        },
        {
          text: remote,
          handler: () => {
            this.preferences[GlobalPreferenceKey.PreferencesSync] = value;
            // Must persist preferences local-only first so that the sync setting is preserved
            this.preferencesService.save(true);
            // Load cloud settings into our local, (they are not saved to localstorage yet)
            this.preferencesService.load();
            // Persist cloud-downloaded settings to localstorage
            this.preferencesService.save(true);
          },
        },
      ],
    });

    alert.present();
  }

  async toggleOfflineCache() {
    if (this.preferences[GlobalPreferenceKey.EnableExperimentalOfflineCache]) {
      const message = await this.translate
        .get("pages.settings.offline.loading")
        .toPromise();

      await this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.ExperimentalOfflineCache,
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

    const language = newLang || this.utilService.getAppBrowserLang();
    this.translate.use(language);
    this.utilService.setHtmlBrowserLang(language);
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

  themeChanged() {
    this.preferencesService.save();

    this.utilService.setAppTheme(this.preferences[GlobalPreferenceKey.Theme]);
  }

  async appThemeChanged() {
    if (this.preferences[GlobalPreferenceKey.Theme] === "black") {
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
              this.preferences[GlobalPreferenceKey.Theme] = AppTheme.Default;
              this.themeChanged();
            },
          },
          {
            text: okay,
            handler: () => {
              this.themeChanged();
            },
          },
        ],
      });

      alert.present();
    } else {
      this.themeChanged();
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
