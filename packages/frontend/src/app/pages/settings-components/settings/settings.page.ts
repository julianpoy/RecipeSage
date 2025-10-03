import { Component, inject } from "@angular/core";
import {
  NavController,
  AlertController,
  ModalController,
} from "@ionic/angular";
import { TranslateService } from "@ngx-translate/core";

import { RouteMap, UtilService } from "../../../services/util.service";
import { PreferencesService } from "../../../services/preferences.service";
import {
  AppTheme,
  encryptUtf8WithRSAKey,
  GlobalPreferenceKey,
  PreferencesSync,
  SupportedLanguages,
} from "@recipesage/util/shared";
import {
  FeatureFlagService,
  FeatureFlagKeys,
} from "../../../services/feature-flag.service";
import {
  QuickTutorialService,
  QuickTutorialOptions,
} from "../../../services/quick-tutorial.service";
import { SwCommunicationService } from "../../../services/sw-communication.service";
import { FontSizeModalComponent } from "../../../components/font-size-modal/font-size-modal.component";
import { MessagingService } from "../../../services/messaging.service";
import { UserService } from "../../../services/user.service";
import { EventName, EventService } from "../../../services/event.service";
import { RecipeCompletionTrackerService } from "../../../services/recipe-completion-tracker.service";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { DebugStoreService } from "../../../services/debugStore.service";
import { DEBUG_DUMP_PUBLIC_KEY } from "../../../utils/localDb/DEBUG_DUMP_PUBLIC_KEY";
import { downloadBlobpartsAsFile } from "../../../utils/downloadBlobpartsAsFile";

@Component({
  selector: "page-settings",
  templateUrl: "settings.page.html",
  styleUrls: ["settings.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class SettingsPage {
  private events = inject(EventService);
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);
  private utilService = inject(UtilService);
  private swCommunicationService = inject(SwCommunicationService);
  private preferencesService = inject(PreferencesService);
  private featureFlagService = inject(FeatureFlagService);
  private quickTutorialService = inject(QuickTutorialService);
  private messagingService = inject(MessagingService);
  private userService = inject(UserService);
  private recipeCompletionTrackerService = inject(
    RecipeCompletionTrackerService,
  );
  private debugStoreService = inject(DebugStoreService);

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

  constructor() {
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

  async _logout() {
    localStorage.removeItem("token");
    await appIdbStorageManager.deleteAllData();

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
    this.events.publish(EventName.ApplicationSplitPaneChanged);

    if (this.preferences[GlobalPreferenceKey.EnableSplitPane]) {
      this.quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.SplitPaneView,
      );
    }
  }

  async exportDebugStore() {
    const dump = await this.debugStoreService.createDebugDump();
    const strDump = this.debugStoreService.stringifyDebugDump(dump);

    const encryptedDump = await encryptUtf8WithRSAKey(
      strDump,
      DEBUG_DUMP_PUBLIC_KEY,
    );

    downloadBlobpartsAsFile({
      data: [JSON.stringify(encryptedDump)],
      mimetype: "application/json",
      filename: `recipesage-debugDump-${Date.now()}.json`,
    });
  }

  async triggerSync() {
    await this.swCommunicationService.triggerFullCacheSync(true);

    const header = await this.translate
      .get("pages.settings.sync.header")
      .toPromise();
    const message = await this.translate
      .get("pages.settings.sync.message")
      .toPromise();
    const okay = await this.translate.get("generic.okay").toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: okay,
        },
      ],
    });

    await alert.present();
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

  async resetCompletion() {
    const header = await this.translate
      .get("pages.settings.resetCompletion.header")
      .toPromise();
    const message = await this.translate
      .get("pages.settings.resetCompletion.message")
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
            this.recipeCompletionTrackerService.reset();
          },
        },
      ],
    });

    alert.present();
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

    this.events.publish(EventName.ApplicationLanguageChanged);
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
}
