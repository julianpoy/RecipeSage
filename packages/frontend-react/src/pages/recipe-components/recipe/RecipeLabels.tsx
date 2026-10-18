import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TagIcon } from "lucide-react";
import type { RecipeSummary } from "@recipesage/prisma";
import { cn } from "@/lib/utils";
import { RecipeSectionTitle } from "./RecipeSectionTitle";

type RecipeLabel = RecipeSummary["recipeLabels"][number];

const CHIP_CLASS_NAME =
  "m-1 inline-flex min-h-8 items-center rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground";

const LabelChip = ({
  recipeLabel,
  isOwner,
}: {
  recipeLabel: RecipeLabel;
  isOwner: boolean;
}) => {
  if (!isOwner) {
    return (
      <span dir="auto" className={CHIP_CLASS_NAME}>
        {recipeLabel.label.title}
      </span>
    );
  }

  return (
    <Link
      to="/list/$folder"
      params={{ folder: "main" }}
      search={{ labels: recipeLabel.label.title }}
      state={{ showBack: true }}
      dir="auto"
      className={cn(
        CHIP_CLASS_NAME,
        "transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
      )}
    >
      {recipeLabel.label.title}
    </Link>
  );
};

export const RecipeLabels = ({
  recipeLabels,
  isOwner,
}: {
  recipeLabels: RecipeLabel[];
  isOwner: boolean;
}) => {
  const { t } = useTranslation();

  const { labelGroups, ungroupedLabels } = useMemo(() => {
    const labelGroupById = new Map<
      string,
      NonNullable<RecipeLabel["label"]["labelGroup"]>
    >();
    for (const recipeLabel of recipeLabels) {
      const labelGroup = recipeLabel.label.labelGroup;
      if (labelGroup) labelGroupById.set(labelGroup.id, labelGroup);
    }

    const labelsForGroupId = (labelGroupId: string | null) =>
      recipeLabels
        .filter(
          (recipeLabel) => recipeLabel.label.labelGroupId === labelGroupId,
        )
        .sort((a, b) => a.label.title.localeCompare(b.label.title));

    return {
      labelGroups: Array.from(labelGroupById.values())
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((labelGroup) => ({
          labelGroup,
          recipeLabels: labelsForGroupId(labelGroup.id),
        })),
      ungroupedLabels: labelsForGroupId(null),
    };
  }, [recipeLabels]);

  return (
    <div>
      <RecipeSectionTitle icon={<TagIcon />}>
        {t("pages.recipeDetails.labels")}
      </RecipeSectionTitle>
      <div className="ms-4 flex flex-wrap gap-4 ps-4">
        {ungroupedLabels.length > 0 && (
          <div>
            {labelGroups.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("pages.recipeDetails.labels.uncatLabels")}
              </p>
            )}
            <div>
              {ungroupedLabels.map((recipeLabel) => (
                <LabelChip
                  key={recipeLabel.id}
                  recipeLabel={recipeLabel}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        )}
        {labelGroups.map(({ labelGroup, recipeLabels: groupLabels }) => (
          <div key={labelGroup.id}>
            <p dir="auto" className="text-sm text-muted-foreground">
              {labelGroup.title}
            </p>
            <div>
              {groupLabels.map((recipeLabel) => (
                <LabelChip
                  key={recipeLabel.id}
                  recipeLabel={recipeLabel}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
