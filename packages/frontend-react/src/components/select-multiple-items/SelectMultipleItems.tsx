import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BanIcon,
  FolderOpenIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import type { TranslationKey } from "../../i18n/TranslationKey";

export interface SelectableItem {
  id: string;
  title: string;
  image?: string;
  icon?: ReactNode;
}

const defaultNormalizeTitle = (title: string) =>
  title.normalize("NFC").toLowerCase();

const EMPTY_DISALLOWED_TITLES: Record<string, TranslationKey> = {};

const EMPTY_SELECTED_ITEMS: never[] = [];

const ItemMedia = ({ item }: { item: SelectableItem }) => (
  <>
    {item.image && (
      <img
        alt=""
        aria-hidden="true"
        src={item.image}
        className="size-6 shrink-0 rounded-full object-cover"
      />
    )}
    {item.icon && (
      <span
        aria-hidden="true"
        className="flex shrink-0 text-muted-foreground [&_svg]:size-5"
      >
        {item.icon}
      </span>
    )}
  </>
);

const resultRowClassName =
  "flex w-full items-center gap-4 border-b px-4 py-2 text-start last:border-b-0";

export const SelectMultipleItems = <T extends SelectableItem>({
  items,
  selectedItems: selectedItemsInput,
  onSelectedItemsChange,
  onNewItem,
  enableCreateNew = false,
  noItemsText,
  noSelectedItemsText,
  searchPlaceholderText,
  reserveSelectedItemsHeight = true,
  reserveSearchResultsHeight = true,
  normalizeTitle = defaultNormalizeTitle,
  disallowedTitles = EMPTY_DISALLOWED_TITLES,
}: {
  items: T[];
  selectedItems?: T[];
  onSelectedItemsChange?: (selectedItems: T[]) => void;
  onNewItem?: (title: string) => void;
  enableCreateNew?: boolean;
  noItemsText?: string;
  noSelectedItemsText?: string;
  searchPlaceholderText?: string;
  reserveSelectedItemsHeight?: boolean;
  reserveSearchResultsHeight?: boolean;
  normalizeTitle?: (title: string) => string;
  disallowedTitles?: Record<string, TranslationKey>;
}) => {
  const { t } = useTranslation();
  const [selectedItems, setSelectedItemsState] = usePropSyncedState<T[]>(
    selectedItemsInput ?? EMPTY_SELECTED_ITEMS,
  );
  const [searchText, setSearchText] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchFocusTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(undefined);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(searchFocusTimeoutRef.current);
      clearTimeout(scrollTimeoutRef.current);
    },
    [],
  );

  const normalizedDisallowedTitles = useMemo(
    () =>
      new Map(
        Object.entries(disallowedTitles).map(([title, reason]) => [
          normalizeTitle(title),
          reason,
        ]),
      ),
    [disallowedTitles, normalizeTitle],
  );

  const disallowedTitleReason = normalizedDisallowedTitles.get(
    normalizeTitle(searchText),
  );

  const isExactMatch = (item: T) =>
    normalizeTitle(item.title) === normalizeTitle(searchText);

  const isMatch = (item: T) =>
    item.title.toLowerCase().includes(searchText.toLowerCase() || "");

  const isSelected = (item: T) =>
    selectedItems.some((selectedItem) => selectedItem.id === item.id);

  const selectedItemIds = new Set(
    selectedItems.map((selectedItem) => selectedItem.id),
  );
  const unselectedItems = items.filter((item) => !selectedItemIds.has(item.id));

  const searchResults = searchText.length
    ? unselectedItems.filter((item) => isMatch(item))
    : unselectedItems;
  const exactItemMatch = searchText.length
    ? items.find((item) => isExactMatch(item))
    : undefined;

  const setSelectedItems = (val: T[]) => {
    setSelectedItemsState(val);
    onSelectedItemsChange?.(val);
  };

  const resetSearch = () => {
    setSearchText("");
  };

  const selectItem = (item: T) => {
    setSelectedItems([...selectedItems, item]);
    resetSearch();
  };

  const deselectItem = (item: T) => {
    const idx = selectedItems.findIndex(
      (selectedItem) => selectedItem.id === item.id,
    );
    if (idx === -1) return;

    setSelectedItems(selectedItems.filter((_, i) => i !== idx));
  };

  const create = () => {
    onNewItem?.(searchText);
    resetSearch();
  };

  const onEnter = () => {
    if (disallowedTitleReason) return;

    const isAlreadyAdded = selectedItems.some((item) => isExactMatch(item));
    if (isAlreadyAdded) return;

    const existingItem = items.find((item) => isExactMatch(item));
    if (existingItem) {
      selectItem(existingItem);
      return;
    }

    if (!enableCreateNew) return;

    create();
  };

  const onSearchFocus = (event: FocusEvent<HTMLInputElement>) => {
    clearTimeout(searchFocusTimeoutRef.current);

    setSearchFocused(true);

    const target = event.currentTarget;
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      target.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }, 200);
  };

  const onSearchBlur = () => {
    clearTimeout(searchFocusTimeoutRef.current);
    // Timeout is needed since we don't currently have a way of knowing if user clicked an item or clicked out completely. Clicking an item takes time to fire
    searchFocusTimeoutRef.current = setTimeout(() => {
      setSearchFocused(false);
    }, 500);
  };

  return (
    <div>
      <div
        className={cn(
          "flex flex-wrap gap-1 px-4",
          reserveSelectedItemsHeight && "min-h-10",
        )}
      >
        {reserveSelectedItemsHeight && selectedItems.length === 0 && (
          <span className="my-1 inline-flex h-8 items-center rounded-full bg-muted px-3 text-sm text-muted-foreground">
            {noSelectedItemsText ||
              t("components.selectMultipleItems.noSelected")}
          </span>
        )}

        {selectedItems.map((selectedItem) => (
          <button
            key={selectedItem.id}
            type="button"
            className="my-1 inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-sm text-foreground hover:bg-muted/70"
            onClick={() => deselectItem(selectedItem)}
          >
            <ItemMedia item={selectedItem} />
            <span dir="auto">{selectedItem.title}</span>
            <Trash2Icon
              className="size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <div className={cn(reserveSearchResultsHeight && "h-[210px]")}>
        <div className="p-2">
          <InputGroup className="h-10">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              dir="auto"
              autoComplete="off"
              enterKeyHint="go"
              placeholder={
                searchPlaceholderText ||
                t("components.selectMultipleItems.searchPlaceholder")
              }
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                onEnter();
              }}
            />
          </InputGroup>
        </div>
        {(searchText.length > 0 || searchFocused) && (
          <div className="px-4">
            <div className="relative">
              <div className="absolute z-10 max-h-[150px] w-full overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-[1px_1px_7px_rgba(0,0,0,0.4)]">
                {!searchResults.length && !searchText.length && (
                  <div className={resultRowClassName}>
                    <span className="text-base">
                      {noItemsText ||
                        t("components.selectMultipleItems.noItems")}
                    </span>
                  </div>
                )}
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className={cn(resultRowClassName, "hover:bg-muted")}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectItem(result)}
                  >
                    <ItemMedia item={result} />
                    <div className="min-w-0 flex-1">
                      <div dir="auto" className="truncate text-base">
                        {result.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("components.selectMultipleItems.select")}
                      </div>
                    </div>
                  </button>
                ))}
                {exactItemMatch && isSelected(exactItemMatch) && (
                  <div className={resultRowClassName}>
                    <ItemMedia item={exactItemMatch} />
                    <div className="min-w-0 flex-1">
                      <div dir="auto" className="truncate text-base">
                        {exactItemMatch.title}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("components.selectMultipleItems.alreadyAdded")}
                      </div>
                    </div>
                  </div>
                )}
                {!enableCreateNew &&
                  !searchResults.length &&
                  searchText.length > 0 && (
                    <div className={resultRowClassName}>
                      <FolderOpenIcon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <span dir="auto" className="text-base">
                        {t("components.selectMultipleItems.null", {
                          searchText,
                        })}
                      </span>
                    </div>
                  )}
                {enableCreateNew &&
                  !exactItemMatch &&
                  searchText.length > 0 &&
                  !disallowedTitleReason && (
                    <button
                      type="button"
                      className={cn(resultRowClassName, "hover:bg-muted")}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={create}
                    >
                      <PlusIcon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div dir="auto" className="truncate text-base">
                          {searchText}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("components.selectMultipleItems.create")}
                        </div>
                      </div>
                    </button>
                  )}
                {enableCreateNew &&
                  !exactItemMatch &&
                  searchText.length > 0 &&
                  disallowedTitleReason && (
                    <div className={resultRowClassName}>
                      <BanIcon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-muted-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <div dir="auto" className="truncate text-base">
                          {searchText}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t(disallowedTitleReason)}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
