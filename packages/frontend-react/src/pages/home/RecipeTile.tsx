import type { MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { RecipeSummaryLite } from "@recipesage/prisma";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Rating } from "../../components/rating/Rating";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";

export interface RecipeTileDisplayOptions {
  showImage: boolean;
  showDescription: boolean;
  showSource: boolean;
  showFromUser: boolean;
  showLabels: boolean;
  showRating: boolean;
  singleColumn: boolean;
}

export const recipeTileClassName = (options: RecipeTileDisplayOptions) =>
  cn(
    "relative block overflow-hidden rounded-[5px] bg-card text-card-foreground shadow-[1px_1px_8px_rgba(0,0,0,0.25)]",
    "h-[calc(var(--image-size)+var(--content-height))] [--content-height:calc(var(--content-padding-leeway)+var(--header-height)+var(--description-height)+var(--source-height)+var(--fromuser-height)+var(--labels-height)+var(--rating-height))] [--content-padding-leeway:1.375rem] [--header-height:2.25rem] [--paragraph-line-height:1.188rem]",
    options.singleColumn ? "w-full" : "w-(--tile-width)",
    options.showImage
      ? "[--image-size:var(--tile-width)]"
      : "[--image-size:1.25rem]",
    options.showDescription
      ? "[--description-height:var(--paragraph-line-height)]"
      : "[--description-height:0px]",
    options.showSource
      ? "[--source-height:var(--paragraph-line-height)]"
      : "[--source-height:0px]",
    options.showFromUser
      ? "[--fromuser-height:var(--paragraph-line-height)]"
      : "[--fromuser-height:0px]",
    options.showLabels
      ? "[--labels-height:var(--paragraph-line-height)]"
      : "[--labels-height:0px]",
    options.showRating
      ? "[--rating-height:var(--paragraph-line-height)]"
      : "[--rating-height:0px]",
  );

const badgeClassName =
  "absolute start-2.5 max-w-[90px] truncate shadow-[1px_1px_5px_rgba(0,0,0,0.2)]";

const paragraphClassName =
  "my-0.5 line-clamp-1 text-sm leading-[normal] text-foreground/80";

export const RecipeTile = ({
  recipe,
  displayOptions,
  selected,
  badgeHandle,
  fromSharedCollection,
  onClick,
}: {
  recipe: RecipeSummaryLite;
  displayOptions: RecipeTileDisplayOptions;
  selected: boolean;
  badgeHandle?: string;
  fromSharedCollection: boolean;
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) => {
  const { t } = useTranslation();
  const imageLocation = recipe.recipeImages?.[0]?.image.location;
  const labelList = recipe.recipeLabels
    .map((recipeLabel) => recipeLabel.label.title)
    .join(", ");
  const hasOwnerBadge = !!badgeHandle || fromSharedCollection;

  return (
    <Link
      to="/recipe/$recipeId"
      params={{ recipeId: recipe.id }}
      className={cn(
        recipeTileClassName(displayOptions),
        "cursor-pointer outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
      onClick={onClick}
    >
      {displayOptions.showImage &&
        (imageLocation ? (
          <img
            loading="lazy"
            decoding="async"
            alt=""
            src={resolveStorageLocation(imageLocation)}
            className={cn(
              "h-(--image-size) object-cover",
              displayOptions.singleColumn ? "w-full" : "w-(--image-size)",
            )}
          />
        ) : (
          <img
            loading="lazy"
            decoding="async"
            alt=""
            src="assets/imgs/logo_green.png"
            className={cn(
              "h-(--image-size) object-cover",
              displayOptions.singleColumn ? "w-full" : "w-(--image-size)",
            )}
          />
        ))}
      <div className="py-[5px] ps-3 pe-[5px]">
        {!displayOptions.showImage && <div className="h-5" />}
        <h2
          dir="auto"
          title={recipe.title}
          className="my-0.5 line-clamp-2 text-base leading-[calc(var(--header-height)/2)] font-normal break-words"
        >
          {recipe.title}
        </h2>
        {recipe.description.length > 0 && displayOptions.showDescription && (
          <p
            dir="auto"
            title={recipe.description}
            className={paragraphClassName}
          >
            {recipe.description}
          </p>
        )}
        {recipe.source.length > 0 && displayOptions.showSource && (
          <p title={recipe.source} className={paragraphClassName}>
            {t("pages.home.recipe.source")} {recipe.source}
          </p>
        )}
        {recipe.folder === "inbox" && recipe.fromUser && (
          <p title={recipe.fromUser.name} className={paragraphClassName}>
            <b>
              {t("pages.home.recipe.from")} {recipe.fromUser.name}
            </b>
          </p>
        )}
        {recipe.recipeLabels.length > 0 && displayOptions.showLabels && (
          <p title={labelList} className={paragraphClassName}>
            {t("pages.home.recipe.labels")} {labelList}
          </p>
        )}
        {!!recipe.rating && displayOptions.showRating && (
          <Rating
            rating={recipe.rating}
            className="flex h-(--rating-height) items-center overflow-hidden text-sm"
          />
        )}
      </div>
      {hasOwnerBadge && (
        <Badge
          className={cn(
            badgeClassName,
            displayOptions.showImage ? "top-2.5" : "top-[5px]",
          )}
        >
          {badgeHandle
            ? `@${badgeHandle}`
            : t("pages.home.recipe.fromSharedCollection")}
        </Badge>
      )}
      {selected && (
        <Badge
          className={cn(
            badgeClassName,
            hasOwnerBadge ? "top-[35px]" : "top-2.5",
          )}
        >
          {t("pages.home.recipe.selected")}
        </Badge>
      )}
    </Link>
  );
};
