import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  BrushIcon,
  BugIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudDownloadIcon,
  CloudOffIcon,
  CloudUploadIcon,
  HeartPulseIcon,
  HouseIcon,
  LanguagesIcon,
  ListIcon,
  LogOutIcon,
  BellIcon,
  RefreshCwIcon,
  ServerIcon,
  TabletIcon,
  Trash2Icon,
  TypeIcon,
  UserIcon,
  UsersIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AppTheme,
  CookModePreferenceKey,
  encryptUtf8WithRSAKey,
  GlobalPreferenceKey,
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
  OfflineModePromptOptions,
  PreferencesSync,
  RecipeDetailsPreferenceKey,
  StartPageOptions,
  SupportedLanguages,
} from "@recipesage/util/shared";
import { cn } from "@/lib/utils";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { showAlert } from "../../../components/dialogs/showAlert";
import { openFontSizeModal } from "../../../components/font-size-modal/openFontSizeModal";
import { useEvent } from "../../../hooks/useEvent";
import { useIsLoggedIn } from "../../../hooks/useIsLoggedIn";
import { debugStore } from "../../../services/debugStore";
import { EventName, events } from "../../../services/events";
import { FeatureFlagKeys, featureFlags } from "../../../services/featureFlags";
import { logoutService } from "../../../services/logoutService";
import { offlineModeService } from "../../../services/offlineModeService";
import {
  QuickTutorialOptions,
  quickTutorialService,
} from "../../../services/quickTutorialService";
import { recipeCompletionTrackerService } from "../../../services/recipeCompletionTrackerService";
import { swCommunicationService } from "../../../services/swCommunicationService";
import { preferencesStore } from "../../../stores/preferencesStore";
import { DEBUG_DUMP_PUBLIC_KEY } from "../../../utils/localDb/DEBUG_DUMP_PUBLIC_KEY";
import { downloadBlobpartsAsFile } from "../../../utils/downloadBlobpartsAsFile";
import { ListButtonRow } from "../list-rows/ListButtonRow";
import { ListLinkRow } from "../list-rows/ListLinkRow";
import {
  ListSelectRow,
  type ListSelectOption,
} from "../list-rows/ListSelectRow";
import { ListSwitchRow } from "../list-rows/ListSwitchRow";
import {
  interactiveListRowClasses,
  listRowClasses,
} from "../list-rows/listRowClasses";

type LanguageSelection = SupportedLanguages | "navigator";

const OFFLINE_MODE_CHANGED_EVENTS = [EventName.ApplicationOfflineModeChanged];

const buildLanguageOptions = (): [SupportedLanguages, string][] => {
  try {
    const languageOptions: [SupportedLanguages, string][] = [];
    for (const supportedLanguage of Object.values(SupportedLanguages)) {
      const locale = new Intl.DisplayNames(supportedLanguage, {
        type: "language",
        fallback: "code",
      });

      languageOptions.push([
        supportedLanguage,
        locale.of(supportedLanguage) || supportedLanguage,
      ]);
    }
    return languageOptions.sort((a, b) => a[1].localeCompare(b[1]));
  } catch (e) {
    console.error("Intl not supported", e);
    return Object.values(SupportedLanguages).map((code) => [code, code]);
  }
};

const getShowSplitPaneOption = () => {
  try {
    return screen.width >= 1200;
  } catch (e) {
    console.error("Could not get screen width", e);
    return false;
  }
};

const setPreferences = preferencesStore.getState().setPreference;

export const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const preferences = preferencesStore((state) => state.preferences);

  const [languageOptions] = useState(buildLanguageOptions);
  const [showSplitPaneOption] = useState(getShowSplitPaneOption);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(
    offlineModeService.enabled,
  );

  const showServerSettings = featureFlags[FeatureFlagKeys.EnableServerSettings];

  useEvent(OFFLINE_MODE_CHANGED_EVENTS, () => {
    setOfflineModeEnabled(offlineModeService.enabled);
  });

  const offlineModeChanged = async (enabled: boolean) => {
    setOfflineModeEnabled(enabled);
    await offlineModeService.setEnabled(enabled);
    setOfflineModeEnabled(offlineModeService.enabled);
  };

  const logout = async () => {
    await logoutService.logout();

    void navigate({
      to: "/auth/$authType",
      params: { authType: "login" },
      replace: true,
    });
  };

  const toggleSplitPane = (enabled: boolean) => {
    setPreferences(GlobalPreferenceKey.EnableSplitPane, enabled);

    events.publish(EventName.ApplicationSplitPaneChanged);

    if (enabled) {
      void quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.SplitPaneView,
      );
    }
  };

  const exportDebugStore = async () => {
    const dump = await debugStore.createDebugDump();
    const strDump = debugStore.stringifyDebugDump(dump);

    const encryptedDump = await encryptUtf8WithRSAKey(
      strDump,
      DEBUG_DUMP_PUBLIC_KEY,
    );

    await downloadBlobpartsAsFile({
      data: [JSON.stringify(encryptedDump)],
      mimetype: "application/json",
      filename: `recipesage-debugDump-${Date.now()}.json`,
    });
  };

  const triggerSync = async () => {
    await swCommunicationService.triggerFullCacheSync(true);

    await showAlert({
      header: t("pages.settings.sync.header"),
      message: t("pages.settings.sync.message"),
      buttons: [
        {
          text: t("generic.okay"),
        },
      ],
    });
  };

  const togglePreferencesSync = async (checked: boolean) => {
    const value = checked ? PreferencesSync.Enabled : PreferencesSync.Disabled;

    if (value === PreferencesSync.Disabled) {
      setPreferences(GlobalPreferenceKey.PreferencesSync, value);
      return;
    }

    await showAlert({
      header: t("pages.settings.preferencesSync.header"),
      message: t("pages.settings.preferencesSync.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          handler: () => {
            window.location.reload();
          },
        },
        {
          text: t("pages.settings.preferencesSync.local"),
          handler: () => {
            setPreferences(GlobalPreferenceKey.PreferencesSync, value);
          },
        },
        {
          text: t("pages.settings.preferencesSync.remote"),
          handler: () => {
            preferencesStore.setState((state) => ({
              preferences: {
                ...state.preferences,
                [GlobalPreferenceKey.PreferencesSync]: value,
              },
            }));
            // Must persist preferences local-only first so that the sync setting is preserved
            preferencesStore.getState().save(true);
            void preferencesStore.getState().loadRemote();
          },
        },
      ],
    });
  };

  const resetCompletion = async () => {
    await showAlert({
      header: t("pages.settings.resetCompletion.header"),
      message: t("pages.settings.resetCompletion.message"),
      buttons: [
        {
          text: t("generic.cancel"),
        },
        {
          text: t("generic.delete"),
          handler: () => {
            recipeCompletionTrackerService.reset();
          },
        },
      ],
    });
  };

  const resetPreferences = async () => {
    await showAlert({
      header: t("pages.settings.resetPrefs.header"),
      message: t("pages.settings.resetPrefs.message"),
      buttons: [
        {
          text: t("generic.cancel"),
        },
        {
          text: t("generic.delete"),
          handler: () => {
            preferencesStore.getState().resetToDefaults();
          },
        },
      ],
    });
  };

  const languageChanged = (language: LanguageSelection) => {
    const newLang = language === "navigator" ? null : language;
    setPreferences(GlobalPreferenceKey.Language, newLang);

    events.publish(EventName.ApplicationLanguageChanged);
  };

  const showFontSizePopover = async () => {
    const fontSize = await openFontSizeModal({
      fontSize: preferences[GlobalPreferenceKey.FontSize],
    });
    if (!fontSize) return;

    setPreferences(GlobalPreferenceKey.FontSize, fontSize);
  };

  const showCookModeFontSizePopover = async () => {
    const fontSize = await openFontSizeModal({
      fontSize: preferences[CookModePreferenceKey.FontSize],
    });
    if (!fontSize) return;

    setPreferences(CookModePreferenceKey.FontSize, fontSize);
  };

  const appThemeChanged = async (theme: AppTheme) => {
    if (theme !== AppTheme.Black) {
      setPreferences(GlobalPreferenceKey.Theme, theme);
      return;
    }

    await showAlert({
      header: t("pages.settings.oled.header"),
      message: t("pages.settings.oled.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          handler: () => {
            setPreferences(GlobalPreferenceKey.Theme, AppTheme.Default);
          },
        },
        {
          text: t("generic.okay"),
          handler: () => {
            setPreferences(GlobalPreferenceKey.Theme, theme);
          },
        },
      ],
    });
  };

  const offlineModePromptOptions: ListSelectOption<OfflineModePromptOptions>[] =
    [
      {
        value: OfflineModePromptOptions.Ask,
        label: t("pages.settings.offlineMode.prompt.ask"),
      },
      {
        value: OfflineModePromptOptions.Never,
        label: t("pages.settings.offlineMode.prompt.never"),
      },
    ];

  const startPageOptions: ListSelectOption<StartPageOptions>[] = [
    {
      value: StartPageOptions.MyRecipes,
      label: t("pages.settings.startPage.myRecipes"),
    },
    {
      value: StartPageOptions.ManageLabels,
      label: t("pages.settings.startPage.manageLabels"),
    },
    {
      value: StartPageOptions.MealPlans,
      label: t("pages.settings.startPage.mealPlans"),
    },
    {
      value: StartPageOptions.ShoppingLists,
      label: t("pages.settings.startPage.shoppingLists"),
    },
  ];

  const includeFriendsOptions: ListSelectOption<MyRecipesIncludeFriendsOptions>[] =
    [
      {
        value: MyRecipesIncludeFriendsOptions.Yes,
        label: t("pages.homeSearchFilterPopover.includeFriends.yes"),
      },
      {
        value: MyRecipesIncludeFriendsOptions.Search,
        label: t("pages.homeSearchFilterPopover.includeFriends.search"),
      },
      {
        value: MyRecipesIncludeFriendsOptions.Browse,
        label: t("pages.homeSearchFilterPopover.includeFriends.browse"),
      },
      {
        value: MyRecipesIncludeFriendsOptions.No,
        label: t("pages.homeSearchFilterPopover.includeFriends.no"),
      },
    ];

  const themeOptions: ListSelectOption<AppTheme>[] = [
    {
      value: AppTheme.Default,
      label: t("pages.settings.theme.default"),
    },
    {
      value: AppTheme.Light,
      label: t("pages.settings.theme.light"),
    },
    {
      value: AppTheme.Midnight,
      label: t("pages.settings.theme.midnight"),
    },
    {
      value: AppTheme.Dark,
      label: t("pages.settings.theme.dark"),
    },
    {
      value: AppTheme.Black,
      label: t("pages.settings.theme.black"),
    },
  ];

  const languageSelectOptions: ListSelectOption<LanguageSelection>[] = [
    {
      value: "navigator",
      label: t("pages.settings.language.default"),
    },
    ...languageOptions.map(([code, name]) => ({
      value: code,
      label: name,
      lang: code,
    })),
  ];

  const sectionHeaderClasses =
    "px-4 pt-6 pb-2 text-sm font-medium text-muted-foreground";
  const dropdownIndicator = (
    <ChevronDownIcon aria-hidden="true" className="size-4! shrink-0" />
  );

  return (
    <>
      <PageHeader title={t("pages.settings.title")} />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-8">
          <h2 className={sectionHeaderClasses}>
            {t("pages.settings.section1.title")}
          </h2>
          <ListLinkRow
            to="/settings/import"
            icon={<CloudUploadIcon aria-hidden="true" />}
          >
            {t("pages.settings.import")}
          </ListLinkRow>
          <ListLinkRow
            to="/settings/export"
            icon={<CloudDownloadIcon aria-hidden="true" />}
          >
            {t("pages.settings.export")}
          </ListLinkRow>
          <ListLinkRow
            to="/settings/jobs"
            icon={<ListIcon aria-hidden="true" />}
          >
            {t("pages.settings.jobs")}
          </ListLinkRow>
          <ListButtonRow
            icon={<BugIcon aria-hidden="true" />}
            onClick={() => void exportDebugStore()}
          >
            {t("pages.settings.debugDump")}
          </ListButtonRow>
          <ListLinkRow
            to="/settings/account"
            icon={<UserIcon aria-hidden="true" />}
          >
            {t("pages.settings.account")}
          </ListLinkRow>
          <ListButtonRow
            icon={<LogOutIcon aria-hidden="true" />}
            disabled={!isLoggedIn}
            onClick={() => void logout()}
          >
            {t("pages.settings.logout")}
          </ListButtonRow>

          <h2 className={sectionHeaderClasses}>
            {t("pages.settings.section2.title")}
          </h2>
          <ListButtonRow
            icon={<RefreshCwIcon aria-hidden="true" />}
            onClick={() => void triggerSync()}
          >
            {t("pages.settings.sync")}
          </ListButtonRow>
          <ListSwitchRow
            icon={<CloudOffIcon aria-hidden="true" />}
            checked={offlineModeEnabled}
            onCheckedChange={(checked) => void offlineModeChanged(checked)}
          >
            {t("pages.settings.offlineMode.enable")}
          </ListSwitchRow>
          <ListSelectRow
            icon={<BellIcon aria-hidden="true" />}
            label={t("pages.settings.offlineMode.prompt")}
            value={preferences[GlobalPreferenceKey.OfflineModePrompt]}
            options={offlineModePromptOptions}
            onValueChange={(value) =>
              setPreferences(GlobalPreferenceKey.OfflineModePrompt, value)
            }
          />
          <ListButtonRow
            icon={<Trash2Icon aria-hidden="true" />}
            onClick={() => void resetCompletion()}
          >
            {t("pages.settings.resetCompletion")}
          </ListButtonRow>
          {showSplitPaneOption && (
            <ListSwitchRow
              icon={<TabletIcon aria-hidden="true" className="rotate-90" />}
              checked={preferences[GlobalPreferenceKey.EnableSplitPane]}
              onCheckedChange={toggleSplitPane}
            >
              {t("pages.settings.splitPane")}
            </ListSwitchRow>
          )}
          <ListSelectRow
            icon={<HouseIcon aria-hidden="true" />}
            label={t("pages.settings.startPage")}
            value={preferences[GlobalPreferenceKey.StartPage]}
            options={startPageOptions}
            onValueChange={(value) =>
              setPreferences(GlobalPreferenceKey.StartPage, value)
            }
          />
          {isLoggedIn && (
            <ListSelectRow
              icon={<UsersIcon aria-hidden="true" />}
              label={t("pages.homeSearchFilterPopover.includeFriends")}
              value={preferences[MyRecipesPreferenceKey.IncludeFriends]}
              options={includeFriendsOptions}
              onValueChange={(value) =>
                setPreferences(MyRecipesPreferenceKey.IncludeFriends, value)
              }
            />
          )}
          <ListSelectRow
            icon={<BrushIcon aria-hidden="true" />}
            label={t("pages.settings.theme")}
            value={preferences[GlobalPreferenceKey.Theme]}
            options={themeOptions}
            onValueChange={(value) => void appThemeChanged(value)}
          />
          <ListSelectRow
            icon={<LanguagesIcon aria-hidden="true" />}
            label={t("pages.settings.language")}
            value={preferences[GlobalPreferenceKey.Language] || "navigator"}
            options={languageSelectOptions}
            optionClassName="capitalize"
            onValueChange={languageChanged}
          />
          <a
            href="https://weblate.recipesage.com"
            target="_blank"
            rel="noopener"
            className={cn(listRowClasses, interactiveListRowClasses)}
          >
            <LanguagesIcon aria-hidden="true" />
            <span className="min-w-0 flex-1 text-sm break-words text-muted-foreground">
              {t("pages.settings.language.contribute")}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4! rtl:rotate-180"
            />
          </a>
          <ListButtonRow
            icon={<TypeIcon aria-hidden="true" />}
            end={dropdownIndicator}
            onClick={() => void showFontSizePopover()}
          >
            {t("pages.settings.fontSize")}
          </ListButtonRow>
          <ListButtonRow
            icon={<UtensilsIcon aria-hidden="true" />}
            end={dropdownIndicator}
            onClick={() => void showCookModeFontSizePopover()}
          >
            {t("pages.settings.cookModeFontSize")}
          </ListButtonRow>
          <ListSwitchRow
            icon={<HeartPulseIcon aria-hidden="true" />}
            checked={
              preferences[RecipeDetailsPreferenceKey.AutoExpandNutrition]
            }
            onCheckedChange={(checked) =>
              setPreferences(
                RecipeDetailsPreferenceKey.AutoExpandNutrition,
                checked,
              )
            }
          >
            {t("pages.settings.autoExpandNutrition")}
          </ListSwitchRow>
          <ListSwitchRow
            icon={<CloudDownloadIcon aria-hidden="true" />}
            checked={
              preferences[GlobalPreferenceKey.PreferencesSync] ===
              PreferencesSync.Enabled
            }
            onCheckedChange={(checked) => void togglePreferencesSync(checked)}
          >
            {t("pages.settings.preferencesSync")}
          </ListSwitchRow>
          <ListButtonRow
            icon={<XIcon aria-hidden="true" />}
            onClick={() => void resetPreferences()}
          >
            {t("pages.settings.reset")}
          </ListButtonRow>
          {showServerSettings && (
            <ListLinkRow
              to="/settings/server"
              icon={<ServerIcon aria-hidden="true" />}
            >
              {t("pages.settings.serverSettings")}
            </ListLinkRow>
          )}
        </div>
      </PageContent>
    </>
  );
};
