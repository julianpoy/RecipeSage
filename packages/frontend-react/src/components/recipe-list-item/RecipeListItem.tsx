import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { RecipeSummaryLite } from "@recipesage/prisma";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CachedImage } from "../CachedImage";
import { Rating } from "../rating/Rating";

export const RecipeListItem = ({
  recipe,
  viewType = "list",
  showImage = true,
  showDescription = true,
  showSource = true,
  showFromUser = false,
  showLabels = true,
  showRating = false,
  selected = false,
  badgeHandle,
  fromSharedCollection = false,
  onRecipeClick,
  children,
}: {
  recipe: RecipeSummaryLite;
  viewType?: "list" | "compact";
  showImage?: boolean;
  showDescription?: boolean;
  showSource?: boolean;
  showFromUser?: boolean;
  showLabels?: boolean;
  showRating?: boolean;
  selected?: boolean;
  badgeHandle?: string;
  fromSharedCollection?: boolean;
  onRecipeClick?: (event: MouseEvent | KeyboardEvent) => void;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();
  const compact = viewType === "compact";
  const imageLocation = recipe.recipeImages?.[0]?.image.location;

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRecipeClick?.(event);
  };

  return (
    <div className="relative block">
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "relative grid h-[calc(var(--image-size)+var(--padding)*2)] cursor-pointer overflow-hidden ps-2 outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset",
          compact
            ? "[--image-size:38px] [--padding:2px]"
            : "[--image-size:80px] [--padding:8px] sm:[--image-size:200px]",
          showImage
            ? "grid-cols-[var(--image-size)_minmax(0,1fr)]"
            : "grid-cols-[0_minmax(0,1fr)]",
        )}
        onClick={(event) => onRecipeClick?.(event)}
        onKeyDown={onKeyDown}
      >
        {showImage ? (
          imageLocation ? (
            <CachedImage
              loading="lazy"
              decoding="async"
              src={imageLocation}
              className="my-(--padding) size-(--image-size) rounded-sm object-cover shadow-[1px_1px_7px_rgba(0,0,0,0.3)]"
            />
          ) : (
            <img
              loading="lazy"
              decoding="async"
              alt=""
              src="assets/imgs/logo_green.png"
              className="my-(--padding) size-(--image-size) rounded-sm object-cover shadow-[1px_1px_7px_rgba(0,0,0,0.3)]"
            />
          )
        ) : (
          <div />
        )}
        <div
          className={cn(
            "ms-4 min-w-0 border-b border-border pe-4",
            !compact && "flex flex-col justify-center",
          )}
        >
          <h2
            dir="auto"
            className="my-0.5 truncate text-base leading-tight font-normal"
          >
            {recipe.title}
          </h2>
          <div
            className={cn(
              "text-sm leading-tight text-foreground/80 *:[p]:m-0 *:[p]:truncate",
              compact && "flex items-center *:[p]:me-2.5",
            )}
          >
            {children}
            {showDescription && recipe.description.length > 0 && (
              <p dir="auto" className={cn(compact && "max-w-[30%]")}>
                {recipe.description}
              </p>
            )}
            {recipe.source.length > 0 && showSource && (
              <p dir="auto">
                {t("pages.home.recipe.source")} {recipe.source}
              </p>
            )}
            {showFromUser && recipe.fromUser && (
              <p dir="auto">
                <b>
                  {t("pages.home.recipe.from")} {recipe.fromUser.name}
                </b>
              </p>
            )}
            {recipe.recipeLabels &&
              recipe.recipeLabels.length > 0 &&
              showLabels && (
                <p dir="auto">
                  {t("pages.home.recipe.labels")}{" "}
                  {recipe.recipeLabels
                    .map((recipeLabel) => recipeLabel.label.title)
                    .join(", ")}
                </p>
              )}
            {showRating && !!recipe.rating && (
              <Rating
                rating={recipe.rating}
                className={cn(
                  "flex h-5 items-center overflow-hidden text-sm",
                  compact && "me-2.5",
                )}
              />
            )}
          </div>
        </div>
        {badgeHandle ? (
          <Badge className="absolute end-2.5 top-2 max-w-[90px] truncate shadow-[1px_1px_5px_rgba(0,0,0,0.2)]">
            @{badgeHandle}
          </Badge>
        ) : (
          fromSharedCollection && (
            <Badge className="absolute end-2.5 top-2 max-w-[90px] truncate shadow-[1px_1px_5px_rgba(0,0,0,0.2)]">
              {t("pages.home.recipe.fromSharedCollection")}
            </Badge>
          )
        )}
        {selected && (
          <Badge
            className={cn(
              "absolute end-2.5 max-w-[90px] truncate shadow-[1px_1px_5px_rgba(0,0,0,0.2)]",
              badgeHandle || fromSharedCollection ? "top-[35px]" : "top-2",
            )}
          >
            {t("pages.home.recipe.selected")}
          </Badge>
        )}
      </div>
    </div>
  );
};
