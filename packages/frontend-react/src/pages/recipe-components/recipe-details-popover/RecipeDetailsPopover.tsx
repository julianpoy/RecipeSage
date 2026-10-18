import { useTranslation } from "react-i18next";
import {
  CalendarIcon,
  CloudDownloadIcon,
  CompassIcon,
  CopyIcon,
  EyeIcon,
  ListIcon,
  PencilIcon,
  PinIcon,
  PrinterIcon,
  ShareIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UtensilsIcon,
} from "lucide-react";
import type { RecipeSummary, UserPublic } from "@recipesage/prisma";
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
import { FeatureFlagKeys, featureFlags } from "../../../services/featureFlags";
import { wakeLockService } from "../../../services/wakeLockService";
import { cookingToolbarStore } from "../../../stores/cookingToolbarStore";
import { preferencesStore } from "../../../stores/preferencesStore";

export type RecipeDetailsPopoverActionTypes =
  | "delete"
  | "clone"
  | "authAndClone"
  | "addToShoppingList"
  | "addToMealPlan"
  | "moveToMain"
  | "share"
  | "print"
  | "pin"
  | "unpin"
  | "edit"
  | "updateWakeLock"
  | "enterCookMode"
  | "setLastMadeToday"
  | "publishToDiscover";

const ITEM_CLASS_NAME = "min-h-10";

export const RecipeDetailsPopover = ({
  recipe,
  me,
  isLoggedIn,
  onAction,
}: {
  recipe?: RecipeSummary;
  me?: Pick<UserPublic, "id">;
  isLoggedIn: boolean;
  onAction: (action: RecipeDetailsPopoverActionTypes) => void;
}) => {
  const { t } = useTranslation();
  const enableWakeLock = preferencesStore(
    (state) => state.preferences[RecipeDetailsPreferenceKey.EnableWakeLock],
  );
  const isPinned = cookingToolbarStore((state) =>
    state.pinnedRecipes.some((pinnedRecipe) => pinnedRecipe.id === recipe?.id),
  );

  const wakeLockCapable = wakeLockService.isCapable;
  const enableDiscover = featureFlags[FeatureFlagKeys.EnableDiscover];
  const isOwner = !!recipe && recipe.userId === me?.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={!recipe}
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
      {recipe && (
        <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-64">
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
          </DropdownMenuGroup>

          {isOwner && recipe.folder === "inbox" && (
            <>
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("pages.recipeDetails.inInbox")}
              </p>
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("moveToMain")}
              >
                <CloudDownloadIcon />
                {t("pages.recipeDetails.saveToMyRecipes")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t("pages.recipeDetailsPopover.dangerZone")}
                </DropdownMenuLabel>
                <DropdownMenuItem
                  variant="destructive"
                  className={ITEM_CLASS_NAME}
                  onClick={() => onAction("delete")}
                >
                  <Trash2Icon />
                  {t("pages.recipeDetailsPopover.delete")}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}

          {!isOwner && isLoggedIn && (
            <>
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("pages.recipeDetails.doesNotBelongToYou")}
              </p>
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("clone")}
              >
                <CloudDownloadIcon />
                {t("pages.recipeDetails.saveToMyRecipes")}
              </DropdownMenuItem>
            </>
          )}

          {!isOwner && !isLoggedIn && (
            <>
              <p className="px-2 py-1.5 text-sm text-muted-foreground">
                {t("pages.recipeDetails.requiresAccountToSave")}
              </p>
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("authAndClone")}
              >
                <CloudDownloadIcon />
                {t("pages.recipeDetails.registerOrLoginToSave")}
              </DropdownMenuItem>
            </>
          )}

          {recipe.folder === "main" && (
            <>
              {isLoggedIn && (
                <>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("addToShoppingList")}
                  >
                    <ListIcon />
                    {t("pages.recipeDetailsPopover.addToShoppingList")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("addToMealPlan")}
                  >
                    <CalendarIcon />
                    {t("pages.recipeDetailsPopover.addToMealPlan")}
                  </DropdownMenuItem>
                </>
              )}
              {isOwner && (
                <>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("share")}
                  >
                    <ShareIcon />
                    {t("pages.recipeDetailsPopover.share")}
                  </DropdownMenuItem>
                  {enableDiscover && (
                    <DropdownMenuItem
                      className={ITEM_CLASS_NAME}
                      onClick={() => onAction("publishToDiscover")}
                    >
                      <CompassIcon />
                      {t("pages.recipeDetails.publishToDiscover")}
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem
                className={ITEM_CLASS_NAME}
                onClick={() => onAction("print")}
              >
                <PrinterIcon />
                {t("pages.recipeDetailsPopover.print")}
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("edit")}
                  >
                    <PencilIcon />
                    {t("pages.recipeDetailsPopover.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("clone")}
                  >
                    <CopyIcon />
                    {t("pages.recipeDetailsPopover.makeACopy")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={ITEM_CLASS_NAME}
                    onClick={() => onAction("setLastMadeToday")}
                  >
                    <CalendarIcon />
                    {t("pages.recipeDetailsPopover.setLastMadeToday")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      {t("pages.recipeDetailsPopover.dangerZone")}
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      variant="destructive"
                      className={ITEM_CLASS_NAME}
                      onClick={() => onAction("delete")}
                    >
                      <Trash2Icon />
                      {t("pages.recipeDetailsPopover.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </>
          )}
        </DropdownMenuContent>
      )}
    </DropdownMenu>
  );
};
