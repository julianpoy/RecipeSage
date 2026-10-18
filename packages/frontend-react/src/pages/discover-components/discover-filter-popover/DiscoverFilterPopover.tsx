import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDownIcon } from "lucide-react";
import { DISCOVER_CATEGORIES } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { TranslationKey } from "../../../i18n/TranslationKey";
import type { DiscoverLanguageOption } from "../../../utils/discoverLanguages";
import type {
  ResettableSelectGroupedOptions,
  ResettableSelectOption,
} from "../../resettable-select-popover/ResettableSelectPopover";
import { openResettableSelectPopover } from "../../resettable-select-popover/openResettableSelectPopover";
import {
  discoverCategoryGroupI18nKeys,
  discoverCategoryI18nKeys,
} from "../discoverCategoryI18nKeys";

export type DiscoverPhotoFilter = "optional" | "required" | "none";

export interface DiscoverFilters {
  languages: string[];
  categories: string[];
  matchAllCategories: boolean;
  minRating: number;
  minRatingCount: number;
  photo: DiscoverPhotoFilter;
}

interface FilterSelectOption<T> {
  value: T;
  label: string;
}

const MIN_RATING_VALUES = [1, 2, 3, 4];
const MIN_RATING_COUNT_VALUES = [1, 5, 10, 25];
const PHOTO_OPTIONS: {
  value: DiscoverPhotoFilter;
  labelKey: TranslationKey;
}[] = [
  { value: "optional", labelKey: "pages.discover.filters.photo.optional" },
  { value: "required", labelKey: "pages.discover.filters.photo.required" },
  { value: "none", labelKey: "pages.discover.filters.photo.none" },
];

const FilterSelect = <T extends string | number>({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: T;
  options: FilterSelectOption<T>[];
  onValueChange: (value: T) => void;
}) => {
  const triggerId = useId();

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b px-1 py-1.5">
      <label htmlFor={triggerId} className="min-w-0 text-sm">
        {label}
      </label>
      <Select
        value={value}
        items={options}
        onValueChange={(newValue) => {
          const option = options.find((item) => item.value === newValue);
          if (option) onValueChange(option.value);
        }}
      >
        <SelectTrigger id={triggerId} className="h-9 max-w-[55%]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const FilterRowButton = ({
  label,
  count,
  onClick,
}: {
  label: ReactNode;
  count: number;
  onClick: () => void;
}) => (
  <button
    type="button"
    className="flex min-h-12 w-full cursor-pointer items-center gap-2 border-b px-1 py-1.5 text-start text-sm hover:bg-muted"
    onClick={onClick}
  >
    <span className="min-w-0 flex-1">{label}</span>
    {count > 0 && <Badge>{count}</Badge>}
    <ChevronDownIcon
      aria-hidden="true"
      className="size-4 text-muted-foreground"
    />
  </button>
);

export const DiscoverFilterPopover = ({
  languageOptions,
  filters,
  onFiltersChange,
}: {
  languageOptions: DiscoverLanguageOption[];
  filters: DiscoverFilters;
  onFiltersChange: (filters: DiscoverFilters) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const matchAllId = useId();

  const applyChange = (change: Partial<DiscoverFilters>) => {
    setOpen(false);
    onFiltersChange({ ...filters, ...change });
  };

  const openLanguageFilter = async () => {
    const ungroupedOptions: ResettableSelectOption[] = languageOptions.map(
      (option) => ({
        title: option.label,
        value: option.code,
        selected: filters.languages.includes(option.code),
      }),
    );

    const selectedValues = await openResettableSelectPopover({
      ungroupedOptions,
      nullMessage: t("pages.discover.filters.language.all"),
    });
    if (!selectedValues) return;

    applyChange({ languages: selectedValues });
  };

  const openCategoryFilter = async () => {
    const groupedOptions: ResettableSelectGroupedOptions = {};
    for (const category of DISCOVER_CATEGORIES) {
      const groupTitle = t(discoverCategoryGroupI18nKeys[category.group]);
      if (!groupedOptions[groupTitle]) {
        groupedOptions[groupTitle] = [];
      }
      const labelKey = discoverCategoryI18nKeys[category.key];
      groupedOptions[groupTitle].push({
        title: labelKey ? t(labelKey) : category.key,
        value: category.key,
        selected: filters.categories.includes(category.key),
      });
    }

    const selectedValues = await openResettableSelectPopover({
      ungroupedOptions: [],
      groupedOptions,
      nullMessage: t("pages.discover.filters.categories.all"),
    });
    if (!selectedValues) return;

    applyChange({ categories: selectedValues });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="h-10 shrink-0 text-primary" />
        }
      >
        {t("pages.discover.filters.title")}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(320px,calc(100vw-2rem))] gap-1 p-3"
      >
        <PopoverTitle className="px-1 pb-1">
          {t("pages.discover.filters.title")}
        </PopoverTitle>

        <FilterRowButton
          label={t("pages.discover.filters.language")}
          count={filters.languages.length}
          onClick={() => {
            setOpen(false);
            void openLanguageFilter();
          }}
        />

        <FilterRowButton
          label={t("pages.discover.filters.categories")}
          count={filters.categories.length}
          onClick={() => {
            setOpen(false);
            void openCategoryFilter();
          }}
        />

        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-1 py-1.5">
          <label htmlFor={matchAllId} className="min-w-0 text-sm">
            {t("pages.discover.filters.matchAllCategories")}
          </label>
          <Switch
            id={matchAllId}
            checked={filters.matchAllCategories}
            onCheckedChange={(checked) =>
              applyChange({ matchAllCategories: checked })
            }
          />
        </div>

        <FilterSelect
          label={t("pages.discover.filters.minRating")}
          value={filters.minRating}
          options={[
            { value: 0, label: t("pages.discover.filters.minRating.any") },
            ...MIN_RATING_VALUES.map((value) => ({
              value,
              label: `${value}+`,
            })),
            { value: 5, label: "5" },
          ]}
          onValueChange={(minRating) => applyChange({ minRating })}
        />

        <FilterSelect
          label={t("pages.discover.filters.minRatingCount")}
          value={filters.minRatingCount}
          options={[
            {
              value: 0,
              label: t("pages.discover.filters.minRatingCount.any"),
            },
            ...MIN_RATING_COUNT_VALUES.map((value) => ({
              value,
              label: `${value}+`,
            })),
          ]}
          onValueChange={(minRatingCount) => applyChange({ minRatingCount })}
        />

        <FilterSelect
          label={t("pages.discover.filters.photo")}
          value={filters.photo}
          options={PHOTO_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.labelKey),
          }))}
          onValueChange={(photo) => applyChange({ photo })}
        />
      </PopoverContent>
    </Popover>
  );
};
