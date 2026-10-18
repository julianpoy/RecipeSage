import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  FolderOpenIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import type {
  LabelSummary,
  ProfileItemSummary,
  ProfileItemType,
  ProfileItemVisibility,
  RecipeSummary,
} from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectLabel } from "../../../components/select-label/SelectLabel";
import { SelectRecipe } from "../../../components/select-recipe/SelectRecipe";
import type { TranslationKey } from "../../../i18n/TranslationKey";

export type ProfileFormItem = Omit<
  ProfileItemSummary,
  "id" | "userId" | "order"
>;

export interface AddProfileItemModalResult {
  item: ProfileFormItem;
}

const ITEM_TYPE_OPTIONS: {
  value: ProfileItemType;
  labelKey: TranslationKey;
}[] = [
  { value: "recipe", labelKey: "pages.addProfileItem.recipe" },
  { value: "label", labelKey: "pages.addProfileItem.label" },
  { value: "all-recipes", labelKey: "pages.addProfileItem.allRecipes" },
];

const ITEM_TYPE_SELECTED_KEYS: Record<ProfileItemType, TranslationKey> = {
  recipe: "pages.addProfileItem.type.recipe",
  label: "pages.addProfileItem.type.label",
  "all-recipes": "pages.addProfileItem.type.allRecipes",
};

const VISIBILITY_OPTIONS: {
  value: ProfileItemVisibility;
  labelKey: TranslationKey;
}[] = [
  {
    value: "public",
    labelKey: "pages.addProfileItem.selectVisibility.public",
  },
  {
    value: "friends-only",
    labelKey: "pages.addProfileItem.selectVisibility.friends",
  },
];

const VISIBILITY_SELECTED_KEYS: Record<ProfileItemVisibility, TranslationKey> =
  {
    public: "pages.addProfileItem.visibilityPublic",
    "friends-only": "pages.addProfileItem.visibilityFriends",
  };

const isItemType = (value: unknown): value is ProfileItemType =>
  ITEM_TYPE_OPTIONS.some((option) => option.value === value);

const isItemVisibility = (value: unknown): value is ProfileItemVisibility =>
  VISIBILITY_OPTIONS.some((option) => option.value === value);

const RadioOptions = <T extends string>({
  options,
  onValueChange,
  isValue,
}: {
  options: { value: T; labelKey: TranslationKey }[];
  onValueChange: (value: T) => void;
  isValue: (value: unknown) => value is T;
}) => {
  const { t } = useTranslation();

  return (
    <RadioGroup
      value={null}
      onValueChange={(value) => {
        if (isValue(value)) onValueChange(value);
      }}
      className="gap-0 px-4"
    >
      {options.map((option) => (
        <Label
          key={option.value}
          className="min-h-12 border-b py-2 text-base font-normal"
        >
          <RadioGroupItem value={option.value} />
          {t(option.labelKey)}
        </Label>
      ))}
    </RadioGroup>
  );
};

const ChangeRow = ({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: ReactNode;
  onClick: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="flex min-h-14 w-full items-center gap-4 border-b px-4 py-2 text-start hover:bg-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground"
      onClick={onClick}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <h2 className="text-base">{title}</h2>
        <p className="text-sm text-muted-foreground">
          {t("pages.addProfileItem.change")}
        </p>
      </div>
    </button>
  );
};

export const AddProfileItemModal = ({
  controls,
}: {
  controls: DialogControls<AddProfileItemModalResult>;
}) => {
  const { t } = useTranslation();

  const [itemType, setItemType] = useState<ProfileItemType | null>(null);
  const [itemVisibility, setItemVisibility] =
    useState<ProfileItemVisibility | null>(null);
  const [itemTitle, setItemTitle] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary>();
  const [selectedLabel, setSelectedLabel] = useState<LabelSummary>();

  const isItemSelected =
    itemType === "all-recipes" ||
    (itemType === "recipe" && !!selectedRecipe) ||
    (itemType === "label" && !!selectedLabel);

  const isValid = !!itemTitle && !!itemVisibility && isItemSelected;

  const done = () => {
    if (!itemType || !itemVisibility) return;

    controls.close({
      item: {
        title: itemTitle,
        type: itemType,
        visibility: itemVisibility,
        label:
          itemType === "label" && selectedLabel
            ? { id: selectedLabel.id, title: selectedLabel.title }
            : null,
        recipe:
          itemType === "recipe" && selectedRecipe
            ? {
                id: selectedRecipe.id,
                recipeImages: selectedRecipe.recipeImages.map(
                  (recipeImage) => ({
                    image: {
                      id: recipeImage.image.id,
                      location: recipeImage.image.location,
                    },
                  }),
                ),
              }
            : null,
      },
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.addProfileItem.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent>
        {!itemType && (
          <div>
            <div className="flex min-h-12 items-center gap-4 px-4">
              <FolderOpenIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
              <span className="text-base">
                {t("pages.addProfileItem.prompt")}
              </span>
            </div>
            <RadioOptions
              options={ITEM_TYPE_OPTIONS}
              isValue={isItemType}
              onValueChange={setItemType}
            />
          </div>
        )}
        {itemType && (
          <ChangeRow
            icon={<FolderOpenIcon aria-hidden="true" />}
            title={
              <>
                {t("pages.addProfileItem.type")}{" "}
                <span>{t(ITEM_TYPE_SELECTED_KEYS[itemType])}</span>
              </>
            }
            onClick={() => setItemType(null)}
          />
        )}
        {(itemType === "recipe" || itemType === "label") && !isItemSelected && (
          <div className="mt-4 flex min-h-12 items-center gap-4 px-4">
            {itemType === "recipe" ? (
              <FileTextIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            ) : (
              <TagIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
            )}
            <span className="text-base">
              {itemType === "recipe"
                ? t("pages.addProfileItem.selectRecipe")
                : t("pages.addProfileItem.selectLabel")}
            </span>
          </div>
        )}
        {itemType === "recipe" && (
          <div className={cn(!selectedRecipe && "px-4")}>
            <SelectRecipe
              selectedRecipe={selectedRecipe}
              onSelectedRecipeChange={setSelectedRecipe}
            />
          </div>
        )}
        {itemType === "label" && (
          <div className={cn(!selectedLabel && "px-4")}>
            <SelectLabel
              selectedLabel={selectedLabel}
              onSelectedLabelChange={setSelectedLabel}
            />
          </div>
        )}
        {isItemSelected && !itemVisibility && (
          <div>
            <div className="flex min-h-12 items-center gap-4 border-b px-4">
              <EyeIcon
                aria-hidden="true"
                className="size-5 shrink-0 text-muted-foreground"
              />
              <span className="text-base">
                {t("pages.addProfileItem.selectVisibility")}
              </span>
            </div>
            <RadioOptions
              options={VISIBILITY_OPTIONS}
              isValue={isItemVisibility}
              onValueChange={setItemVisibility}
            />
          </div>
        )}
        {itemVisibility && (
          <ChangeRow
            icon={<EyeIcon aria-hidden="true" />}
            title={t(VISIBILITY_SELECTED_KEYS[itemVisibility])}
            onClick={() => setItemVisibility(null)}
          />
        )}
        {itemVisibility && (
          <div className="flex items-end gap-4 px-4 pt-4">
            <TagIcon
              aria-hidden="true"
              className="mb-2.5 size-5 shrink-0 text-muted-foreground"
            />
            <div className="min-w-0 flex-1">
              <TextField
                label={t("pages.addProfileItem.itemTitle")}
                value={itemTitle}
                onValueChange={setItemTitle}
              />
            </div>
          </div>
        )}
      </PageContent>
      <PageFooter className="flex flex-col gap-2 p-4">
        <Link
          to="/legal"
          search={{ scrollTo: "sharing" }}
          className="px-4 text-sm text-primary hover:underline"
          onClick={() => controls.close()}
        >
          {t("pages.addProfileItem.tos")}
        </Link>
        <Button size="lg" className="w-full" disabled={!isValid} onClick={done}>
          <CheckIcon data-icon="inline-start" />
          {t("pages.addProfileItem.done")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
