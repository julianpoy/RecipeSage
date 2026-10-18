import { useTranslation } from "react-i18next";
import type { RecipeSummary } from "@recipesage/prisma";
import { cn } from "@/lib/utils";
import { Rating } from "../../../components/rating/Rating";
import { truncate } from "../../../utils/truncate";

export const RecipeMeta = ({
  recipe,
  recipeLinkUrl,
  truncateUrl,
  className,
}: {
  recipe: Pick<
    RecipeSummary,
    "rating" | "source" | "url" | "activeTime" | "totalTime" | "yield"
  >;
  recipeLinkUrl: string;
  truncateUrl: boolean;
  className?: string;
}) => {
  const { t } = useTranslation();

  const trimmedUrl = recipe.url.trim();
  const trimmedSource = recipe.source.trim();

  return (
    <div
      className={cn(
        "my-4 flex flex-wrap justify-start border-y text-sm [&>div]:p-1.5",
        className,
      )}
    >
      {!!recipe.rating && (
        <div>
          <p>
            <b>{t("pages.recipeDetails.rating")}:</b>
            <Rating rating={recipe.rating} className="ms-1.5 text-lg/3.5" />
          </p>
        </div>
      )}
      {(recipe.source || recipe.url) && (
        <div>
          <p className="break-words">
            <b>{t("pages.recipeDetails.source")}: </b>
            {trimmedUrl ? (
              <a
                href={recipeLinkUrl}
                target="_blank"
                rel="noreferrer noopener"
                dir="auto"
                className="text-primary underline"
              >
                {trimmedSource ||
                  (truncateUrl ? truncate(trimmedUrl, 40) : recipe.url)}
              </a>
            ) : (
              <span dir="auto">{trimmedSource}</span>
            )}
          </p>
        </div>
      )}
      {!!recipe.activeTime && (
        <div>
          <p className="break-words">
            <b>{t("pages.recipeDetails.activeTime")}: </b>
            <span dir="auto">{recipe.activeTime}</span>
          </p>
        </div>
      )}
      {!!recipe.totalTime && (
        <div>
          <p className="break-words">
            <b>{t("pages.recipeDetails.totalTime")}: </b>
            <span dir="auto">{recipe.totalTime}</span>
          </p>
        </div>
      )}
      {!!recipe.yield && (
        <div>
          <p className="break-words">
            <b>{t("pages.recipeDetails.yield")}: </b>
            <span dir="auto">{recipe.yield}</span>
          </p>
        </div>
      )}
    </div>
  );
};
