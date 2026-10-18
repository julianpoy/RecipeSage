import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  FlagIcon,
  PencilIcon,
  PinIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UtensilsIcon,
} from "lucide-react";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { wakeLockService } from "../../../services/wakeLockService";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";
import { preferencesStore } from "../../../stores/preferencesStore";

export type DiscoverRecipePopoverAction =
  | "edit"
  | "unpublish"
  | "pin"
  | "unpin"
  | "enterCookMode"
  | "updateWakeLock"
  | "share"
  | "report";

const ITEM_CLASS_NAME = "min-h-10";

export const DiscoverRecipePopover = ({
  recipeId,
  isAuthor,
  onAction,
}: {
  recipeId: string;
  isAuthor: boolean;
  onAction: (action: DiscoverRecipePopoverAction) => void;
}) => {
  const { t } = useTranslation();
  const enableWakeLock = preferencesStore(
    (state) => state.preferences[RecipeDetailsPreferenceKey.EnableWakeLock],
  );
  const isPinned = cookingToolbarStore((state) =>
    state.pinnedRecipes.some((pinnedRecipe) => pinnedRecipe.id === recipeId),
  );

  const wakeLockCapable = wakeLockService.isCapable;

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
      <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-56">
        {wakeLockCapable && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                {t("pages.recipeDetailsPopover.options")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => {
                  preferencesStore
                    .getState()
                    .setPreference(
                      RecipeDetailsPreferenceKey.EnableWakeLock,
                      !enableWakeLock,
                    );
                  onAction("updateWakeLock");
                }}
              >
                <EyeIcon />
                <span className="flex-1 whitespace-normal">
                  {t("pages.recipeDetailsPopover.keepScreenOn")}
                </span>
                <Switch
                  checked={enableWakeLock}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="pointer-events-none"
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("pages.recipeDetailsPopover.actions")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className={ITEM_CLASS_NAME}
            onClick={() => onAction(isPinned ? "unpin" : "pin")}
          >
            <PinIcon />
            {isPinned
              ? t("pages.recipeDetailsPopover.unPinRecipe")
              : t("pages.recipeDetailsPopover.pinRecipe")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS_NAME}
            onClick={() => onAction("enterCookMode")}
          >
            <UtensilsIcon />
            {t("pages.recipeDetailsPopover.enterCookMode")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={ITEM_CLASS_NAME}
            onClick={() => onAction("share")}
          >
            <ShareIcon />
            {t("pages.recipeDetailsPopover.share")}
          </DropdownMenuItem>
          {isAuthor ? (
            <>
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("edit")}
              >
                <PencilIcon />
                {t("pages.discoverRecipe.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("unpublish")}
              >
                <Trash2Icon />
                {t("pages.discoverRecipe.unpublish")}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              className={ITEM_CLASS_NAME}
              onClick={() => onAction("report")}
            >
              <FlagIcon />
              {t("pages.discoverRecipe.report")}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
