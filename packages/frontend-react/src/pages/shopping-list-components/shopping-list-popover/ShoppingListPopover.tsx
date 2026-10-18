import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  BanIcon,
  CircleMinusIcon,
  MenuIcon,
  PencilIcon,
  PrinterIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import type { ShoppingListItemSummary } from "@recipesage/prisma";
import {
  GlobalPreferenceKey,
  ShoppingListPreferenceKey,
  ShoppingListSortOptions,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
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
import { showAlert } from "../../../components/dialogs/showAlert";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import { printUrls } from "../../../utils/printUrls";
import { openShoppingListCategoryOrderModal } from "../shopping-list-category-order-modal/openShoppingListCategoryOrderModal";
import { openShoppingListIgnoreModal } from "../shopping-list-ignore-modal/openShoppingListIgnoreModal";
import { openUpdateShoppingListModal } from "../update-shopping-list-modal/openUpdateShoppingListModal";

type ShoppingList = RouterOutputs["shoppingLists"]["getShoppingList"];

type BooleanPreferenceKey =
  | ShoppingListPreferenceKey.GroupCategories
  | ShoppingListPreferenceKey.GroupSimilar
  | ShoppingListPreferenceKey.ShowRecipeTitle
  | ShoppingListPreferenceKey.ShowAddedBy
  | ShoppingListPreferenceKey.ShowAddedOn
  | ShoppingListPreferenceKey.PreferDelete;

const SORT_OPTIONS: {
  value: ShoppingListSortOptions;
  label: TranslationKey;
}[] = [
  {
    value: ShoppingListSortOptions.TitleDesc,
    label: "pages.shoppingListPopover.sortBy.title",
  },
  {
    value: ShoppingListSortOptions.CreatedAtDesc,
    label: "pages.shoppingListPopover.sortBy.createdDesc",
  },
  {
    value: ShoppingListSortOptions.CreatedAtAsc,
    label: "pages.shoppingListPopover.sortBy.createdAsc",
  },
];

const parseSortOption = (value: unknown) =>
  Object.values(ShoppingListSortOptions).find((option) => option === value);

const SectionHeader = ({ children }: { children: ReactNode }) => (
  <h2 className="pt-2 text-base font-medium">{children}</h2>
);

const PreferenceToggle = ({
  preferenceKey,
  children,
}: {
  preferenceKey: BooleanPreferenceKey;
  children: ReactNode;
}) => {
  const checked = preferencesStore((state) => state.preferences[preferenceKey]);

  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-4 border-b py-1">
      <span className="min-w-0 flex-1 text-sm">{children}</span>
      <Switch
        checked={checked}
        onCheckedChange={(value) =>
          preferencesStore.getState().setPreference(preferenceKey, value)
        }
      />
    </label>
  );
};

export const ShoppingListPopover = ({
  shoppingListId,
  shoppingList,
  shoppingListItems,
  isOwner,
  setReference,
  onReload,
}: {
  shoppingListId: string;
  shoppingList: ShoppingList | undefined;
  shoppingListItems: ShoppingListItemSummary[] | undefined;
  isOwner: boolean;
  setReference: (reference: string) => void;
  onReload: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const sortSelectId = useId();
  const [open, setOpen] = useState(false);
  const sortBy = preferencesStore(
    (state) => state.preferences[ShoppingListPreferenceKey.SortBy],
  );

  const dismiss = () => setOpen(false);

  const print = () => {
    const preferences = preferencesStore.getState().preferences;
    window.open(
      printUrls.shoppingList(shoppingListId, {
        groupSimilar: preferences[ShoppingListPreferenceKey.GroupSimilar],
        groupCategories: preferences[ShoppingListPreferenceKey.GroupCategories],
        sortBy: preferences[ShoppingListPreferenceKey.SortBy],
        preferredLanguage:
          preferences[GlobalPreferenceKey.Language] || undefined,
        today: dayjs().format("YYYY-MM-DD"),
      }),
    );
  };

  const _removeAllItems = async () => {
    const items = shoppingListItems || [];
    if (items.length === 0) {
      return;
    }

    const loading = loadingService.start();

    const itemIds = items.map((el) => el.id);

    await serverActions.shoppingLists.deleteShoppingListItems({
      ids: itemIds,
      shoppingListId,
    });

    loading.dismiss();
    onReload();
  };

  const removeAllItems = async () => {
    dismiss();
    await showAlert({
      header: t("pages.shoppingListPopover.removeAll.header"),
      message: t("pages.shoppingListPopover.removeAll.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void _removeAllItems();
          },
        },
      ],
    });
  };

  const _deleteList = async () => {
    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    setReference(reference);

    const response = isOwner
      ? await serverActions.shoppingLists.deleteShoppingList({
          id: shoppingListId,
          reference,
        })
      : await serverActions.shoppingLists.detachShoppingList({
          id: shoppingListId,
          reference,
        });
    loading.dismiss();
    if (!response) return;

    setReference(response.reference);
    void navigate({ to: "/shopping-lists", replace: true });
  };

  const deleteList = () => {
    dismiss();
    void showAlert({
      header: isOwner
        ? t("pages.shoppingListPopover.deleteList.header")
        : t("pages.shoppingListPopover.removeSelfFromList.header"),
      message: isOwner
        ? t("pages.shoppingListPopover.deleteList.message")
        : t("pages.shoppingListPopover.removeSelfFromList.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: isOwner ? t("generic.delete") : t("generic.confirm"),
          variant: "destructive",
          handler: () => {
            void _deleteList();
          },
        },
      ],
    });
  };

  const updateList = async () => {
    if (!shoppingList) return;
    dismiss();
    await openUpdateShoppingListModal({ shoppingList });
    onReload();
  };

  const showIgnoreModal = async () => {
    dismiss();
    await openShoppingListIgnoreModal();
  };

  const showCategoryOrderModal = async () => {
    if (!shoppingList) return;
    dismiss();
    await openShoppingListCategoryOrderModal({
      shoppingListId,
      categoryOrder: shoppingList.categoryOrder || undefined,
    });
    onReload();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={!shoppingList}
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit aria-expanded:bg-white/10 aria-expanded:text-inherit"
            aria-label={t("generic.options")}
          />
        }
      >
        <SlidersHorizontalIcon className="size-6" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] gap-2 overflow-y-auto"
      >
        <SectionHeader>
          {t("pages.shoppingListPopover.options.title")}
        </SectionHeader>

        <div className="flex min-h-11 flex-wrap items-center gap-2 border-b py-1">
          <label htmlFor={sortSelectId} className="min-w-0 flex-1 text-sm">
            {t("pages.shoppingListPopover.sortBy")}
          </label>
          <Select
            value={sortBy}
            items={SORT_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.label),
            }))}
            onValueChange={(value) => {
              const option = parseSortOption(value);
              if (!option) return;
              preferencesStore
                .getState()
                .setPreference(ShoppingListPreferenceKey.SortBy, option);
            }}
          >
            <SelectTrigger id={sortSelectId} className="h-9 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <PreferenceToggle
          preferenceKey={ShoppingListPreferenceKey.GroupCategories}
        >
          {t("pages.shoppingListPopover.groupCategories")}
        </PreferenceToggle>
        <PreferenceToggle
          preferenceKey={ShoppingListPreferenceKey.GroupSimilar}
        >
          {t("pages.shoppingListPopover.groupSimilar")}
        </PreferenceToggle>
        <PreferenceToggle
          preferenceKey={ShoppingListPreferenceKey.ShowRecipeTitle}
        >
          {t("pages.shoppingListPopover.showTitle")}
        </PreferenceToggle>
        {!!shoppingList?.collaboratorUsers.length && (
          <PreferenceToggle
            preferenceKey={ShoppingListPreferenceKey.ShowAddedBy}
          >
            {t("pages.shoppingListPopover.showAddedBy")}
          </PreferenceToggle>
        )}
        <PreferenceToggle preferenceKey={ShoppingListPreferenceKey.ShowAddedOn}>
          {t("pages.shoppingListPopover.showAddedOn")}
        </PreferenceToggle>
        <PreferenceToggle
          preferenceKey={ShoppingListPreferenceKey.PreferDelete}
        >
          {t("pages.shoppingListPopover.preferDelete")}
        </PreferenceToggle>

        <SectionHeader>
          {t("pages.shoppingListPopover.actions.title")}
        </SectionHeader>

        <Button
          className="h-auto min-h-9 w-full whitespace-normal"
          onClick={print}
        >
          <PrinterIcon data-icon="inline-start" />
          {t("pages.shoppingListPopover.print")}
        </Button>
        <Button
          className="h-auto min-h-9 w-full whitespace-normal"
          onClick={() => void showIgnoreModal()}
        >
          <BanIcon data-icon="inline-start" />
          {t("pages.shoppingLists.editIgnore")}
        </Button>
        <Button
          className="h-auto min-h-9 w-full whitespace-normal"
          disabled={!isOwner}
          onClick={() => void updateList()}
        >
          <PencilIcon data-icon="inline-start" />
          {t("pages.shoppingListPopover.update")}
        </Button>
        <Button
          className="h-auto min-h-9 w-full whitespace-normal"
          disabled={!isOwner}
          onClick={() => void showCategoryOrderModal()}
        >
          <MenuIcon data-icon="inline-start" />
          {t("pages.shoppingListPopover.categoryOrder")}
        </Button>

        <SectionHeader>
          {t("pages.shoppingListPopover.dangerZone.title")}
        </SectionHeader>

        <Button
          variant="destructive"
          className="h-auto min-h-9 w-full whitespace-normal"
          onClick={() => void removeAllItems()}
        >
          <CircleMinusIcon data-icon="inline-start" />
          {t("pages.shoppingListPopover.removeAll")}
        </Button>
        <Button
          variant="destructive"
          className="h-auto min-h-9 w-full whitespace-normal"
          onClick={deleteList}
        >
          <Trash2Icon data-icon="inline-start" />
          {t("pages.shoppingListPopover.delete")}
        </Button>
      </PopoverContent>
    </Popover>
  );
};
