import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import {
  MyRecipesPreferenceKey,
  MyRecipesSortOptions,
  MyRecipesViewTypeOptions,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TranslationKey } from "../../i18n/TranslationKey";
import {
  QuickTutorialOptions,
  quickTutorialService,
} from "../../services/quickTutorialService";
import { preferencesStore } from "../../stores/preferencesStore";

export interface HomePopoverResult {
  selectionMode?: boolean;
  refreshSearch?: boolean;
}

type HomePopoverToggleKey =
  | MyRecipesPreferenceKey.ShowLabels
  | MyRecipesPreferenceKey.ShowLabelChips
  | MyRecipesPreferenceKey.ShowImages
  | MyRecipesPreferenceKey.ShowSource
  | MyRecipesPreferenceKey.ShowRecipeDescription
  | MyRecipesPreferenceKey.ShowRating;

const VIEW_TYPE_OPTIONS: [MyRecipesViewTypeOptions, TranslationKey][] = [
  [MyRecipesViewTypeOptions.Tiles, "pages.homepopover.options.layout.tiles"],
  [MyRecipesViewTypeOptions.List, "pages.homepopover.options.layout.list"],
  [
    MyRecipesViewTypeOptions.Compact,
    "pages.homepopover.options.layout.compact",
  ],
];

const SORT_OPTIONS: [MyRecipesSortOptions, TranslationKey][] = [
  [MyRecipesSortOptions.TitleAsc, "pages.homepopover.options.sortBy.title"],
  [
    MyRecipesSortOptions.CreatedAtDesc,
    "pages.homepopover.options.sortBy.createdNewest",
  ],
  [
    MyRecipesSortOptions.CreatedAtAsc,
    "pages.homepopover.options.sortBy.createdOldest",
  ],
  [
    MyRecipesSortOptions.UpdatedAtDesc,
    "pages.homepopover.options.sortBy.updatedNewest",
  ],
  [
    MyRecipesSortOptions.UpdatedAtAsc,
    "pages.homepopover.options.sortBy.updatedOldest",
  ],
  [
    MyRecipesSortOptions.LastMadeAtDesc,
    "pages.homepopover.options.sortBy.lastMadeNewest",
  ],
  [
    MyRecipesSortOptions.LastMadeAtAsc,
    "pages.homepopover.options.sortBy.lastMadeOldest",
  ],
];

const findOption = <T extends string>(
  options: [T, TranslationKey][],
  value: unknown,
): T | undefined => options.find(([option]) => option === value)?.[0];

const PopoverRow = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-12 items-center gap-3 border-b px-4 py-2">
    {children}
  </div>
);

export const HomePopover = ({
  guestMode,
  selectionMode,
  onDismiss,
}: {
  guestMode: boolean;
  selectionMode: boolean;
  onDismiss: (result: HomePopoverResult) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const preferences = preferencesStore((state) => state.preferences);
  const setPreference = preferencesStore((state) => state.setPreference);

  const dismiss = (result: HomePopoverResult) => {
    setOpen(false);
    onDismiss(result);
  };

  const toggleSelectionMode = () => {
    const enteringSelectionMode = !selectionMode;
    if (enteringSelectionMode) {
      void quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.MultipleRecipeSelection,
      );
    }

    dismiss({
      selectionMode: enteringSelectionMode,
    });
  };

  const renderToggle = (
    key: HomePopoverToggleKey,
    labelKey: TranslationKey,
  ) => (
    <PopoverRow>
      <Label className="flex-1 justify-between gap-4 text-base leading-snug font-normal">
        <span className="min-w-0 whitespace-normal">{t(labelKey)}</span>
        <Switch
          checked={preferences[key]}
          onCheckedChange={(checked) => {
            setPreference(key, checked);
            dismiss({});
          }}
        />
      </Label>
    </PopoverRow>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.options")}
          />
        }
      >
        <SlidersHorizontalIcon className="size-6" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
      >
        <PopoverTitle className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">
          {t("pages.homepopover.options")}
        </PopoverTitle>

        <PopoverRow>
          <span className="flex-1 text-base">
            {t("pages.homepopover.options.layout")}
          </span>
          <Select
            value={preferences[MyRecipesPreferenceKey.ViewType]}
            items={VIEW_TYPE_OPTIONS.map(([value, labelKey]) => ({
              value,
              label: t(labelKey),
            }))}
            onValueChange={(value) => {
              const viewType = findOption(VIEW_TYPE_OPTIONS, value);
              if (!viewType) return;
              setPreference(MyRecipesPreferenceKey.ViewType, viewType);
              dismiss({});
            }}
          >
            <SelectTrigger
              aria-label={t("pages.homepopover.options.layout")}
              className="max-w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_TYPE_OPTIONS.map(([value, labelKey]) => (
                <SelectItem key={value} value={value}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverRow>

        {renderToggle(
          MyRecipesPreferenceKey.ShowLabels,
          "pages.homepopover.options.showLabels",
        )}

        {!guestMode &&
          renderToggle(
            MyRecipesPreferenceKey.ShowLabelChips,
            "pages.homepopover.options.showLabelToggles",
          )}

        {renderToggle(
          MyRecipesPreferenceKey.ShowImages,
          "pages.homepopover.options.showImages",
        )}

        {renderToggle(
          MyRecipesPreferenceKey.ShowSource,
          "pages.homepopover.options.showSource",
        )}

        {renderToggle(
          MyRecipesPreferenceKey.ShowRecipeDescription,
          "pages.homepopover.options.showRecipeDescription",
        )}

        {renderToggle(
          MyRecipesPreferenceKey.ShowRating,
          "pages.homepopover.options.showRating",
        )}

        <PopoverRow>
          <span className="flex-1 text-base">
            {t("pages.homepopover.options.sortBy")}
          </span>
          <Select
            value={preferences[MyRecipesPreferenceKey.SortBy]}
            items={SORT_OPTIONS.map(([value, labelKey]) => ({
              value,
              label: t(labelKey),
            }))}
            onValueChange={(value) => {
              const sortBy = findOption(SORT_OPTIONS, value);
              if (!sortBy) return;
              setPreference(MyRecipesPreferenceKey.SortBy, sortBy);
              dismiss({ refreshSearch: true });
            }}
          >
            <SelectTrigger
              aria-label={t("pages.homepopover.options.sortBy")}
              className="max-w-44"
            >
              <SelectValue className="truncate" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="end">
              {SORT_OPTIONS.map(([value, labelKey]) => (
                <SelectItem key={value} value={value}>
                  {t(labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PopoverRow>

        {!guestMode && (
          <div className="p-4">
            <Button className="w-full" onClick={toggleSelectionMode}>
              {selectionMode ? (
                <XIcon data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              <span className="whitespace-normal">
                {selectionMode
                  ? t("pages.homepopover.options.unselectAllRecipes")
                  : t("pages.homepopover.options.selectMultipleRecipes")}
              </span>
            </Button>
          </div>
        )}
        {guestMode && (
          <p className="px-4 py-3">
            {t("pages.homepopover.warning.optionsHidden")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
