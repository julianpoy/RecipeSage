import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT } from "@recipesage/util/shared";
import type { ShoppingListSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertModal } from "../alert-modal/AlertModal";
import { TextField } from "../forms/TextField";
import { shoppingListCategoryI18nKeys } from "./shoppingListCategoryI18nKeys";
import { formatDate, getCurrentLocale } from "../../utils/formatDate";

const USER_CUSTOM_CATEGORIES_KEY = "shoppingListUserCustomCategories";

const readStoredCategories = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(USER_CUSTOM_CATEGORIES_KEY) || "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
};

const getUserKnownCategories = (builtinCategories: string[]): string[] => {
  const userKnownCategories = new Set<string>(readStoredCategories());

  for (const builtinCategory of builtinCategories) {
    userKnownCategories.delete(builtinCategory);
  }

  return Array.from(userKnownCategories);
};

const addUserKnownCategory = (
  builtinCategories: string[],
  category: string,
) => {
  const existing = getUserKnownCategories(builtinCategories);
  if (!existing.includes(category)) {
    existing.push(category);
    localStorage.setItem(USER_CUSTOM_CATEGORIES_KEY, JSON.stringify(existing));
  }
};

type PopoverView = "menu" | "moveToList" | "copyToList";

export const ShoppingListItem = ({
  title,
  completed,
  recipeTitle,
  createdAt,
  ownerName,
  showDeleteButton = false,
  hideRecategorizeOptions = false,
  hideDeleteOption = false,
  otherShoppingLists,
  onCompleteToggle,
  onRecategorize,
  onTitleUpdate,
  onDeleteClick,
  onMoveToList,
  onCopyToList,
}: {
  title: string;
  completed: boolean;
  recipeTitle?: string;
  createdAt?: Date | string;
  ownerName?: string;
  showDeleteButton?: boolean;
  hideRecategorizeOptions?: boolean;
  hideDeleteOption?: boolean;
  otherShoppingLists?: ShoppingListSummary[];
  onCompleteToggle: () => void;
  onRecategorize: (category: string) => void;
  onTitleUpdate: (title: string) => void;
  onDeleteClick: () => void;
  onMoveToList: (shoppingListId: string) => void;
  onCopyToList: (shoppingListId: string) => void;
}) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [popoverView, setPopoverView] = useState<PopoverView>("menu");
  const [isEditTitleModalOpen, setIsEditTitleModalOpen] = useState(false);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] =
    useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [optimisticCompleted, setOptimisticCompleted] = useState<{
    from: boolean;
    value: boolean;
  }>();

  const displayCompleted =
    optimisticCompleted && optimisticCompleted.from === completed
      ? optimisticCompleted.value
      : completed;

  const getBuiltinCategories = () =>
    shoppingListCategoryI18nKeys.map((key) => t(key));

  const getCategories = () => {
    const builtinCategories = getBuiltinCategories();
    const collator = new Intl.Collator(getCurrentLocale());
    return [
      ...builtinCategories,
      ...getUserKnownCategories(builtinCategories),
    ].sort(collator.compare);
  };

  const onMenuOpenChange = (open: boolean) => {
    setMenuOpen(open);
    if (!open) setPopoverView("menu");
  };

  const selectDestinationList = (shoppingListId: string) => {
    const currentView = popoverView;
    onMenuOpenChange(false);

    if (currentView === "moveToList") onMoveToList(shoppingListId);
    if (currentView === "copyToList") onCopyToList(shoppingListId);
  };

  const showEditTitleInput = () => {
    setEditTitleInput(title);
    setIsEditTitleModalOpen(true);
  };

  const submitEditTitle = () => {
    const newTitle = editTitleInput.trim();
    if (!newTitle) return;

    setIsEditTitleModalOpen(false);
    if (newTitle === title) return;

    onTitleUpdate(newTitle);
  };

  const showMoveToArbitraryInput = () => {
    setCustomCategoryInput("");
    setIsCustomCategoryModalOpen(true);
  };

  const submitCustomCategory = () => {
    const category = customCategoryInput.trim();
    if (!category) return;

    setIsCustomCategoryModalOpen(false);
    addUserKnownCategory(getBuiltinCategories(), category);
    onRecategorize(category);
  };

  return (
    <>
      <div className="flex min-h-12 items-center gap-1 ps-4 pe-1">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-2.5">
          <Checkbox
            className="size-5"
            checked={displayCompleted}
            onCheckedChange={(checked) => {
              setOptimisticCompleted({ from: completed, value: checked });
              onCompleteToggle();
            }}
          />
          <div className="min-w-0 flex-1 leading-6 break-words" dir="auto">
            {title}
            {recipeTitle && (
              <p className="text-sm leading-snug text-muted-foreground">
                {t("components.shoppingListItem.recipe")}{" "}
                <span>{recipeTitle}</span>
              </p>
            )}
            {createdAt && (
              <p className="text-sm leading-snug text-muted-foreground">
                {t("components.shoppingListItem.added")}{" "}
                <span>{formatDate(createdAt, { now: true })}</span>
              </p>
            )}
            {ownerName && (
              <p className="text-sm leading-snug text-muted-foreground">
                {t("components.shoppingListItem.addedBy")}{" "}
                <span>{ownerName}</span>
              </p>
            )}
          </div>
        </label>
        {showDeleteButton && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-destructive hover:text-destructive"
            aria-label={t("components.shoppingListItem.delete")}
            onClick={onDeleteClick}
          >
            <Trash2Icon className="size-5" />
          </Button>
        )}
        <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-lg"
                aria-label={t("generic.options")}
              />
            }
          >
            <EllipsisVerticalIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-w-[90vw]">
            {popoverView === "menu" ? (
              <>
                <DropdownMenuItem
                  className="min-h-10"
                  onClick={showEditTitleInput}
                >
                  <PencilIcon />
                  {t("components.shoppingListItem.edit")}
                </DropdownMenuItem>
                {!hideDeleteOption && (
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-10"
                    onClick={onDeleteClick}
                  >
                    <Trash2Icon />
                    {t("components.shoppingListItem.delete")}
                  </DropdownMenuItem>
                )}
                {!!otherShoppingLists?.length && (
                  <>
                    <DropdownMenuItem
                      className="min-h-10"
                      closeOnClick={false}
                      onClick={() => setPopoverView("moveToList")}
                    >
                      <ArrowRightIcon className="rtl:rotate-180" />
                      <span className="flex-1">
                        {t("components.shoppingListItem.moveToList")}
                      </span>
                      <ChevronRightIcon className="rtl:rotate-180" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="min-h-10"
                      closeOnClick={false}
                      onClick={() => setPopoverView("copyToList")}
                    >
                      <CopyIcon />
                      <span className="flex-1">
                        {t("components.shoppingListItem.copyToList")}
                      </span>
                      <ChevronRightIcon className="rtl:rotate-180" />
                    </DropdownMenuItem>
                  </>
                )}
                {!hideRecategorizeOptions && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="pt-3">
                      {t("components.shoppingListItem.moveTo")}
                    </DropdownMenuLabel>
                    {getCategories().map((categoryTitle) => (
                      <DropdownMenuItem
                        key={categoryTitle}
                        className="min-h-10"
                        onClick={() => onRecategorize(categoryTitle)}
                      >
                        <span dir="auto">{categoryTitle}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      className="min-h-10"
                      onClick={showMoveToArbitraryInput}
                    >
                      {t("components.shoppingListItem.moveToCustom")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                )}
              </>
            ) : (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="pt-2">
                  {popoverView === "moveToList"
                    ? t("components.shoppingListItem.moveToList.header")
                    : t("components.shoppingListItem.copyToList.header")}
                </DropdownMenuLabel>
                {otherShoppingLists?.map((shoppingList) => (
                  <DropdownMenuItem
                    key={shoppingList.id}
                    className="min-h-10"
                    onClick={() => selectDestinationList(shoppingList.id)}
                  >
                    <span dir="auto">{shoppingList.title}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  className="min-h-10"
                  closeOnClick={false}
                  onClick={() => setPopoverView("menu")}
                >
                  <ArrowLeftIcon className="rtl:rotate-180" />
                  {t("generic.back")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertModal
        open={isEditTitleModalOpen}
        onOpenChange={setIsEditTitleModalOpen}
        header={t("components.shoppingListItem.editTitle.header")}
        onConfirm={submitEditTitle}
      >
        <TextField
          value={editTitleInput}
          onValueChange={setEditTitleInput}
          maxLength={SHOPPING_LIST_ITEMS_TITLE_LENGTH_LIMIT}
          placeholder={t("components.shoppingListItem.editTitle.placeholder")}
          aria-label={t("components.shoppingListItem.editTitle.header")}
          autoCapitalize="on"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              submitEditTitle();
            }
          }}
        />
      </AlertModal>

      <AlertModal
        open={isCustomCategoryModalOpen}
        onOpenChange={setIsCustomCategoryModalOpen}
        header={t("components.shoppingListItem.customCategory.title")}
        message={t("components.shoppingListItem.customCategory.message")}
        confirmLabel={t("generic.save")}
        onConfirm={submitCustomCategory}
      >
        <TextField
          value={customCategoryInput}
          onValueChange={setCustomCategoryInput}
          placeholder={t(
            "components.shoppingListItem.customCategory.placeholder",
          )}
          aria-label={t("components.shoppingListItem.customCategory.title")}
          autoCapitalize="on"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              submitCustomCategory();
            }
          }}
        />
      </AlertModal>
    </>
  );
};
