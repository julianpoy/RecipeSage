import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpenIcon, SearchIcon, TagIcon } from "lucide-react";
import type { LabelSummary } from "@recipesage/prisma";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useActionQuery } from "../../hooks/useActionQuery";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";

export const SelectLabel = ({
  selectedLabel: selectedLabelInput,
  onSelectedLabelChange,
}: {
  selectedLabel?: LabelSummary;
  onSelectedLabelChange?: (label: LabelSummary | undefined) => void;
}) => {
  const { t } = useTranslation();
  const [selectedLabel, setSelectedLabelState] =
    usePropSyncedState(selectedLabelInput);
  const [searchText, setSearchText] = useState("");

  const labelsQuery = useActionQuery(["labels.getLabels"], async () => {
    const loading = loadingService.start();
    const response = await serverActions.labels.getLabels();
    loading.dismiss();
    return response;
  });

  const labels = useMemo(
    () =>
      [...(labelsQuery.data || [])].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    [labelsQuery.data],
  );

  const results = searchText
    ? labels.filter((label) => label.title.includes(searchText))
    : labels;

  const setSelectedLabel = (label: LabelSummary | undefined) => {
    setSelectedLabelState(label);
    onSelectedLabelChange?.(label);
  };

  const selectLabel = (label: LabelSummary) => {
    setSelectedLabel(label);
    setSearchText("");
  };

  if (selectedLabel) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-xl px-4 py-2 text-start hover:bg-muted"
        onClick={() => setSelectedLabel(undefined)}
      >
        <TagIcon
          className="size-6 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-base">
            {selectedLabel.title}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("components.selectLabel.change")}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div>
      <div className="p-2">
        <InputGroup className="h-10">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            dir="auto"
            autoComplete="off"
            placeholder={t("components.selectLabel.search")}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </InputGroup>
      </div>
      {searchText.length > 0 && (
        <div className="px-4">
          <div className="relative">
            <div className="absolute z-10 w-full overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-[1px_1px_7px_rgba(0,0,0,0.4)]">
              {results.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className="flex w-full items-center gap-4 border-b px-4 py-2 text-start last:border-b-0 hover:bg-muted"
                  onClick={() => selectLabel(label)}
                >
                  <TagIcon
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div dir="auto" className="truncate text-base">
                      {label.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("components.selectLabel.select")}
                    </div>
                  </div>
                </button>
              ))}
              {results.length === 0 && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <FolderOpenIcon
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span dir="auto">
                    {t("components.selectLabel.null", { name: searchText })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
