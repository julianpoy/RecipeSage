import { i18n } from "../i18n/i18n";
import type { TranslationKey } from "../i18n/TranslationKey";
import { showAlert } from "../components/dialogs/showAlert";

interface QuickTutorialBlurb {
  header: TranslationKey;
  message: TranslationKey;
}

// Mapped values of these enums are stored in client localStorage.
// Changing mapped value names here will reset their viewed status
export enum QuickTutorialOptions {
  MultipleRecipeSelection = "multipleRecipeSelection",
  MultipleLabelSelection = "multipleLabelSelection",
  SplitPaneView = "splitPaneView",
  PinnedRecipes = "pinnedRecipes",
  NativePrintView = "nativePrintView",
}

const quickTutorialBlurbs: Record<QuickTutorialOptions, QuickTutorialBlurb> = {
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
  [QuickTutorialOptions.PinnedRecipes]: {
    header: "services.quickTutorial.pinnedRecipes.header",
    message: "services.quickTutorial.pinnedRecipes.message",
  },
  [QuickTutorialOptions.NativePrintView]: {
    header: "services.quickTutorial.nativePrintView.header",
    message: "services.quickTutorial.nativePrintView.message",
  },
};

const TUTORIAL_LOCALSTORAGE_KEY = "seenQuickTutorialOptions";

const fetchSeenTutorials = (): string[] => {
  try {
    const seenTutorials = localStorage.getItem(TUTORIAL_LOCALSTORAGE_KEY);
    if (!seenTutorials) return [];
    const parsed: unknown = JSON.parse(seenTutorials);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string")
      : [];
  } catch (_e) {
    return [];
  }
};

const saveSeenTutorials = (seenTutorials: string[]) => {
  try {
    const serialized = JSON.stringify(seenTutorials);
    localStorage.setItem(TUTORIAL_LOCALSTORAGE_KEY, serialized);
  } catch (e) {
    console.error(e);
  }
};

const markQuickTutorialAsSeen = (quickTutorialKey: QuickTutorialOptions) => {
  const seenTutorials = fetchSeenTutorials();
  seenTutorials.push(quickTutorialKey);
  saveSeenTutorials(seenTutorials);
};

const openTutorials = new Set<QuickTutorialOptions>();

export const quickTutorialService = {
  async triggerQuickTutorial(quickTutorialKey: QuickTutorialOptions) {
    const seenTutorials = fetchSeenTutorials();
    if (seenTutorials.includes(quickTutorialKey)) return;
    if (openTutorials.has(quickTutorialKey)) return;

    const tutorial = quickTutorialBlurbs[quickTutorialKey];

    openTutorials.add(quickTutorialKey);
    try {
      await showAlert({
        header: i18n.t(tutorial.header),
        message: i18n.t(tutorial.message),
        buttons: [{ text: i18n.t("generic.okay") }],
      });
    } finally {
      openTutorials.delete(quickTutorialKey);
    }

    markQuickTutorialAsSeen(quickTutorialKey);
  },
};
