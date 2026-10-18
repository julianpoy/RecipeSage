import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TagIcon } from "lucide-react";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { cleanLabelTitle } from "@recipesage/util/shared";
import {
  SelectMultipleItems,
  type SelectableItem,
} from "../../../components/select-multiple-items/SelectMultipleItems";
import type { TranslationKey } from "../../../i18n/TranslationKey";

const mapLabelsToSelectableItems = (labels: LabelSummary[]) =>
  labels.map((label) => ({
    id: label.id,
    title: label.title,
    icon: <TagIcon />,
  }));

const labelsForGroupId = (
  labels: LabelSummary[],
  labelGroupId: string | null,
) => labels.filter((label) => label.labelGroupId === labelGroupId);

const disallowedTitleMap = (
  labels: LabelSummary[],
  labelGroupId: string | null,
) =>
  labels
    .filter((label) => label.labelGroupId !== labelGroupId)
    .reduce<Record<string, TranslationKey>>((acc, label) => {
      acc[label.title] = "pages.editRecipe.addLabel.otherGroup";
      return acc;
    }, {});

const LabelGroupInput = ({
  labels,
  selectedLabels,
  labelGroupId,
  noItemsText,
  onSelectedLabelsChange,
  onAddLabel,
}: {
  labels: LabelSummary[];
  selectedLabels: LabelSummary[];
  labelGroupId: string | null;
  noItemsText: string;
  onSelectedLabelsChange: (
    labelGroupId: string | null,
    selected: SelectableItem[],
  ) => void;
  onAddLabel: (title: string, labelGroupId: string | null) => void;
}) => {
  const { t } = useTranslation();

  const items = useMemo(
    () => mapLabelsToSelectableItems(labelsForGroupId(labels, labelGroupId)),
    [labels, labelGroupId],
  );
  const selectedItems = useMemo(
    () =>
      mapLabelsToSelectableItems(
        labelsForGroupId(selectedLabels, labelGroupId),
      ),
    [selectedLabels, labelGroupId],
  );
  const disallowedTitles = useMemo(
    () => disallowedTitleMap(labels, labelGroupId),
    [labels, labelGroupId],
  );

  return (
    <SelectMultipleItems
      items={items}
      enableCreateNew
      selectedItems={selectedItems}
      onSelectedItemsChange={(selected) =>
        onSelectedLabelsChange(labelGroupId, selected)
      }
      onNewItem={(title) => onAddLabel(title, labelGroupId)}
      normalizeTitle={cleanLabelTitle}
      disallowedTitles={disallowedTitles}
      reserveSearchResultsHeight={false}
      noSelectedItemsText={t("pages.editRecipe.input.labels.noSelectedItems")}
      noItemsText={noItemsText}
      searchPlaceholderText={t("pages.editRecipe.input.labels.search")}
    />
  );
};

export const EditRecipeLabels = ({
  labels,
  labelGroups,
  selectedLabels,
  onSelectedLabelsChange,
  onAddLabel,
}: {
  labels: LabelSummary[];
  labelGroups: LabelGroupSummary[];
  selectedLabels: LabelSummary[];
  onSelectedLabelsChange: (
    labelGroupId: string | null,
    selected: SelectableItem[],
  ) => void;
  onAddLabel: (title: string, labelGroupId: string | null) => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="px-4 py-3 text-base font-medium">
        {t("pages.editRecipe.input.labels")}
      </h2>
      <div className="mb-[100px] grid grid-cols-[repeat(auto-fill,minmax(min(350px,100%),auto))] gap-x-4 px-4">
        <div>
          {labelGroups.length > 0 && (
            <p className="px-4 py-3">
              {t("pages.editRecipe.input.uncatLabels")}
            </p>
          )}
          <LabelGroupInput
            labels={labels}
            selectedLabels={selectedLabels}
            labelGroupId={null}
            noItemsText={t("pages.editRecipe.input.labels.noItems")}
            onSelectedLabelsChange={onSelectedLabelsChange}
            onAddLabel={onAddLabel}
          />
        </div>
        {labelGroups.map((labelGroup) => (
          <div key={labelGroup.id}>
            <p dir="auto" className="px-4 py-3">
              {labelGroup.title}
            </p>
            <LabelGroupInput
              labels={labels}
              selectedLabels={selectedLabels}
              labelGroupId={labelGroup.id}
              noItemsText={t("pages.editRecipe.input.labels.noItemsGroup")}
              onSelectedLabelsChange={onSelectedLabelsChange}
              onAddLabel={onAddLabel}
            />
          </div>
        ))}
      </div>
    </>
  );
};
