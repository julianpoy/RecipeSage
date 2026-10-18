import { useTranslation } from "react-i18next";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TranslationKey } from "../../../i18n/TranslationKey";

export type DiscoverSortBy = "trending" | "newest" | "topRated" | "mostSaved";

const SORT_OPTIONS: { value: DiscoverSortBy; labelKey: TranslationKey }[] = [
  { value: "trending", labelKey: "pages.discover.filters.sort.trending" },
  { value: "newest", labelKey: "pages.discover.filters.sort.newest" },
  { value: "topRated", labelKey: "pages.discover.filters.sort.topRated" },
  { value: "mostSaved", labelKey: "pages.discover.filters.sort.mostSaved" },
];

export const DiscoverPopover = ({
  sortBy,
  onSortByChange,
}: {
  sortBy: DiscoverSortBy;
  onSortByChange: (sortBy: DiscoverSortBy) => void;
}) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("generic.options")}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("pages.discover.filters.sort")}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={(value) => {
              const option = SORT_OPTIONS.find(
                (sortOption) => sortOption.value === value,
              );
              if (option) onSortByChange(option.value);
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <DropdownMenuRadioItem
                key={option.value}
                value={option.value}
                closeOnClick
                className="min-h-10"
              >
                {t(option.labelKey)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
