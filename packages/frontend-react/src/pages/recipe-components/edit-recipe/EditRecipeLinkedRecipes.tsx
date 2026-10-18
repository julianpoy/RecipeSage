import { useTranslation } from "react-i18next";
import { XIcon } from "lucide-react";
import type { RecipeSummary, RecipeSummaryLite } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { CachedImage } from "../../../components/CachedImage";
import { SelectRecipe } from "../../../components/select-recipe/SelectRecipe";

export interface LinkedRecipe {
  id: string;
  title: string;
  recipeImages: RecipeSummaryLite["recipeImages"];
}

export const EditRecipeLinkedRecipes = ({
  linkedRecipes,
  onLinkedRecipeSelected,
  onRemoveLinkedRecipe,
}: {
  linkedRecipes: LinkedRecipe[];
  onLinkedRecipeSelected: (recipe: RecipeSummary | undefined) => void;
  onRemoveLinkedRecipe: (recipeId: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="px-4 py-3 text-base font-medium">
        {t("pages.editRecipe.input.linkedRecipes")}
      </h2>

      <div className="px-4">
        {linkedRecipes.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            {t("pages.editRecipe.input.linkedRecipes.none")}
          </p>
        )}

        {linkedRecipes.length > 0 && (
          <ul>
            {linkedRecipes.map((linkedRecipe) => {
              const imageLocation =
                linkedRecipe.recipeImages.at(0)?.image.location;
              return (
                <li
                  key={linkedRecipe.id}
                  className="flex min-h-12 items-center gap-4 px-4 py-1"
                >
                  {imageLocation ? (
                    <CachedImage
                      src={imageLocation}
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <img
                      src="assets/imgs/logo_green_padded.png"
                      alt=""
                      className="size-10 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <span dir="auto" className="min-w-0 flex-1 truncate">
                    {linkedRecipe.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    className="text-primary"
                    aria-label={t("generic.delete")}
                    onClick={() => onRemoveLinkedRecipe(linkedRecipe.id)}
                  >
                    <XIcon className="size-5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <SelectRecipe
          onSelectedRecipeChange={onLinkedRecipeSelected}
          includeAllFriends
          enableSelectedState={false}
        />
      </div>
    </div>
  );
};
