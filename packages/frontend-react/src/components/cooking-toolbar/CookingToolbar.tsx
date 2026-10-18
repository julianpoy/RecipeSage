import type { MouseEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { PinIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { showAlert } from "../dialogs/showAlert";
import { CachedImage } from "../CachedImage";
import { useNavigateOrOpenWindow } from "../../hooks/useNavigateOrOpenWindow";
import {
  cookingToolbarStore,
  type PinnedRecipe,
} from "../../stores/cookingToolbarStore";

export const CookingToolbar = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const navigateOrOpenWindow = useNavigateOrOpenWindow();
  const pinnedRecipes = cookingToolbarStore((state) => state.pinnedRecipes);

  const openRecipe = (pinnedRecipe: PinnedRecipe, event: MouseEvent) => {
    if (pinnedRecipe.path) {
      navigateOrOpenWindow(pinnedRecipe.path, event);
      return;
    }
    const inCookMode = router.state.location.pathname.endsWith("/cook");
    const path = inCookMode
      ? `/recipe/${pinnedRecipe.id}/cook`
      : `/recipe/${pinnedRecipe.id}`;
    navigateOrOpenWindow(path, event);
  };

  const clearPins = () =>
    showAlert({
      header: t("components.cookingToolbar.clear"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.confirm"),
          handler: () => {
            cookingToolbarStore.getState().clearPins();
          },
        },
      ],
    });

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 box-content flex h-[60px] items-center bg-background px-2.5 pb-[env(safe-area-inset-bottom)] text-foreground shadow-[0_0_5px_rgba(0,0,0,0.2)] print:hidden">
      <span className="flex w-[50px] shrink-0 justify-center">
        <PinIcon aria-hidden="true" className="size-[25px]" />
      </span>
      <div className="flex min-w-0 overflow-x-auto">
        {pinnedRecipes.map((pinnedRecipe) => (
          <button
            key={pinnedRecipe.id}
            type="button"
            aria-label={pinnedRecipe.title}
            title={pinnedRecipe.title}
            className="relative mx-2.5 shrink-0 cursor-pointer rounded-full outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/30"
            onClick={(event) => openRecipe(pinnedRecipe, event)}
          >
            {pinnedRecipe.imageUrl ? (
              <CachedImage
                src={pinnedRecipe.imageUrl}
                className="size-[50px] rounded-full object-cover shadow-[1px_1px_5px_rgba(0,0,0,0.2)]"
              />
            ) : (
              <img
                src="assets/imgs/logo_green.png"
                alt=""
                className="size-[50px] rounded-full shadow-[1px_1px_5px_rgba(0,0,0,0.2)]"
              />
            )}
            <span
              aria-hidden="true"
              className="absolute -end-0.5 bottom-[3px] size-5 rounded-full bg-foreground text-center text-sm leading-5 text-background"
            >
              {pinnedRecipe.title.substring(0, 1).toUpperCase()}
            </span>
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon-lg"
        className="ms-auto shrink-0"
        aria-label={t("components.cookingToolbar.clearLabel")}
        onClick={() => void clearPins()}
      >
        <XIcon className="size-8" />
      </Button>
    </div>
  );
};
