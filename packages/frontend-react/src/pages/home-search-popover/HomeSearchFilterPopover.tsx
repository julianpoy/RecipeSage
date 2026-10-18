import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon, FunnelIcon } from "lucide-react";
import type { LabelSummary, NutritionFilter } from "@recipesage/prisma";
import {
  MyRecipesIncludeFriendsOptions,
  MyRecipesPreferenceKey,
} from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
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
import { openNutritionFilterPopover } from "../../components/nutrition-filter-popover/openNutritionFilterPopover";
import { openRatingFilterPopover } from "../../components/rating-filter-popover/openRatingFilterPopover";
import type { TranslationKey } from "../../i18n/TranslationKey";
import { preferencesStore } from "../../stores/preferencesStore";
import { countActiveNutritionRanges } from "../../utils/nutritionFilter";
import type {
  ResettableSelectGroupedOptions,
  ResettableSelectOption,
} from "../resettable-select-popover/ResettableSelectPopover";
import { openResettableSelectPopover } from "../resettable-select-popover/openResettableSelectPopover";

export interface HomeSearchFilterResult {
  refreshSearch: boolean;
  ratingFilter: (number | null)[];
  selectedLabels: string[];
  nutritionFilter: NutritionFilter;
}

const INCLUDE_FRIENDS_OPTIONS: [
  MyRecipesIncludeFriendsOptions,
  TranslationKey,
][] = [
  [
    MyRecipesIncludeFriendsOptions.Yes,
    "pages.homeSearchFilterPopover.includeFriends.yes",
  ],
  [
    MyRecipesIncludeFriendsOptions.Search,
    "pages.homeSearchFilterPopover.includeFriends.search",
  ],
  [
    MyRecipesIncludeFriendsOptions.Browse,
    "pages.homeSearchFilterPopover.includeFriends.browse",
  ],
  [
    MyRecipesIncludeFriendsOptions.No,
    "pages.homeSearchFilterPopover.includeFriends.no",
  ],
];

const FilterRow = ({
  title,
  badge,
  onClick,
}: {
  title: string;
  badge?: ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="flex min-h-12 w-full cursor-pointer items-center gap-3 border-b px-4 py-2 text-start text-base outline-none hover:bg-muted focus-visible:bg-muted"
    onClick={onClick}
  >
    <span className="min-w-0 flex-1">{title}</span>
    {badge}
    <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
  </button>
);

export const HomeSearchFilterPopover = ({
  contextUserId,
  guestMode,
  labels,
  selectedLabels,
  ratingFilter,
  nutritionFilter,
  onDismiss,
}: {
  contextUserId: string | null;
  guestMode: boolean;
  labels: LabelSummary[];
  selectedLabels: string[];
  ratingFilter: (number | null)[];
  nutritionFilter: NutritionFilter;
  onDismiss: (result: HomeSearchFilterResult) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const preferences = preferencesStore((state) => state.preferences);
  const setPreference = preferencesStore((state) => state.setPreference);

  const nutritionFilterActiveCount =
    countActiveNutritionRanges(nutritionFilter);

  const dismiss = (filters: {
    ratingFilter?: (number | null)[];
    selectedLabels?: string[];
    nutritionFilter?: NutritionFilter;
  }) => {
    setOpen(false);
    onDismiss({
      refreshSearch: true,
      ratingFilter: filters.ratingFilter || ratingFilter,
      selectedLabels: filters.selectedLabels || selectedLabels,
      nutritionFilter: filters.nutritionFilter || nutritionFilter,
    });
  };

  const openLabelFilter = async () => {
    const ungroupedTitle = t("pages.recipeDetails.labels.uncatLabels");

    const groupCount = labels.filter((label) => label.labelGroupId).length;

    let hasSharedLabels = false;
    const ungroupedOptions: ResettableSelectOption[] = [];
    let groupedOptions = [...labels]
      .sort((a, b) => a.title.localeCompare(b.title))
      .reduce<ResettableSelectGroupedOptions>((acc, label) => {
        const isOwnLabel = contextUserId === label.userId;
        if (!isOwnLabel) {
          hasSharedLabels = true;
        }
        const groupTitle = label.labelGroup?.title || ungroupedTitle;
        acc[groupTitle] ||= [];
        acc[groupTitle].push({
          title: isOwnLabel ? (
            `${label.title} (${label._count.recipeLabels})`
          ) : (
            <>
              {label.title} ({t("pages.homepopover.labelShared")})
            </>
          ),
          value: label.title,
          selected: selectedLabels.indexOf(label.title) > -1,
        });

        return acc;
      }, {});

    // Do not add unlabeled option if no labels are present
    if (Object.keys(groupedOptions).length)
      ungroupedOptions.unshift({
        title: t("pages.homepopover.unlabeled"),
        value: "unlabeled",
        selected: selectedLabels.indexOf("unlabeled") > -1,
      });

    // If we have no groups to display, do not show the "ungrouped" labels as their own section, instead everything is ungrouped now
    if (!groupCount && Object.values(groupedOptions).length === 1) {
      ungroupedOptions.push(...Object.values(groupedOptions)[0]);
      groupedOptions = {};
    }

    setOpen(false);
    const result = await openResettableSelectPopover({
      message: hasSharedLabels
        ? t("pages.homepopover.labelSharedCollection")
        : undefined,
      ungroupedOptions,
      groupedOptions,
      nullMessage: t("pages.homepopover.labelNull"),
    });
    if (!result) {
      setOpen(true);
      return;
    }

    const unlabeledOnly = result.includes("unlabeled");
    dismiss({
      selectedLabels: unlabeledOnly ? ["unlabeled"] : result,
    });
  };

  const openRatingFilter = async () => {
    setOpen(false);
    const result = await openRatingFilterPopover({ ratingFilter });
    if (!result) {
      setOpen(true);
      return;
    }

    dismiss({ ratingFilter: result });
  };

  const openNutritionFilter = async () => {
    setOpen(false);
    const result = await openNutritionFilterPopover({ nutritionFilter });
    if (!result) {
      setOpen(true);
      return;
    }

    dismiss({ nutritionFilter: result });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="sm" className="text-primary" />}
      >
        {t("pages.home.search.filter")}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
      >
        <PopoverTitle className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">
          {t("pages.homeSearchFilterPopover.title")}
        </PopoverTitle>

        <FilterRow
          title={t("pages.homeSearchFilterPopover.filterByRating")}
          badge={
            ratingFilter.length > 0 && (
              <Badge>
                {ratingFilter.length}
                <FunnelIcon />
              </Badge>
            )
          }
          onClick={() => void openRatingFilter()}
        />

        <FilterRow
          title={t("pages.homeSearchFilterPopover.filterByLabel")}
          badge={
            selectedLabels.length > 0 && <Badge>{selectedLabels.length}</Badge>
          }
          onClick={() => void openLabelFilter()}
        />

        <div className="flex min-h-12 items-center border-b px-4 py-2">
          <Label className="flex-1 justify-between gap-4 text-base leading-snug font-normal">
            <span className="min-w-0 whitespace-normal">
              {t("pages.homeSearchFilterPopover.matchAllLabels")}
            </span>
            <Switch
              checked={
                preferences[MyRecipesPreferenceKey.EnableLabelIntersection]
              }
              onCheckedChange={(checked) => {
                setPreference(
                  MyRecipesPreferenceKey.EnableLabelIntersection,
                  checked,
                );
                dismiss({});
              }}
            />
          </Label>
        </div>

        <FilterRow
          title={t("pages.homeSearchFilterPopover.filterByNutrition")}
          badge={
            nutritionFilterActiveCount > 0 && (
              <Badge>
                {nutritionFilterActiveCount}
                <FunnelIcon />
              </Badge>
            )
          }
          onClick={() => void openNutritionFilter()}
        />

        {!guestMode && (
          <div className="flex min-h-12 items-center gap-3 border-b px-4 py-2">
            <span className="min-w-0 flex-1 text-base">
              {t("pages.homeSearchFilterPopover.includeFriends")}
            </span>
            <Select
              value={preferences[MyRecipesPreferenceKey.IncludeFriends]}
              items={INCLUDE_FRIENDS_OPTIONS.map(([value, labelKey]) => ({
                value,
                label: t(labelKey),
              }))}
              onValueChange={(value) => {
                const includeFriends = INCLUDE_FRIENDS_OPTIONS.find(
                  ([option]) => option === value,
                )?.[0];
                if (!includeFriends) return;
                setPreference(
                  MyRecipesPreferenceKey.IncludeFriends,
                  includeFriends,
                );
                dismiss({});
              }}
            >
              <SelectTrigger
                aria-label={t("pages.homeSearchFilterPopover.includeFriends")}
                className="max-w-40"
              >
                <SelectValue className="truncate" />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align="end">
                {INCLUDE_FRIENDS_OPTIONS.map(([value, labelKey]) => (
                  <SelectItem key={value} value={value}>
                    {t(labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {guestMode && (
          <p className="px-4 py-3">
            {t("pages.homeSearchFilterPopover.optionsHidden")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};
