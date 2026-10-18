import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface ResettableSelectOption {
  title: ReactNode;
  value: string;
  selected: boolean;
}

export type ResettableSelectGroupedOptions = Record<
  string,
  ResettableSelectOption[]
>;

const ungroupedKey = (idx: number) => `ungrouped:${idx}`;
const groupedKey = (groupTitle: string, idx: number) =>
  `grouped:${groupTitle}:${idx}`;

const getInitialSelection = (
  ungroupedOptions: ResettableSelectOption[],
  groupedOptions: ResettableSelectGroupedOptions,
) => {
  const selection: Record<string, boolean> = {};
  ungroupedOptions.forEach((option, idx) => {
    selection[ungroupedKey(idx)] = option.selected;
  });
  for (const [groupTitle, options] of Object.entries(groupedOptions)) {
    options.forEach((option, idx) => {
      selection[groupedKey(groupTitle, idx)] = option.selected;
    });
  }
  return selection;
};

export const ResettableSelectPopover = ({
  message,
  ungroupedOptions,
  groupedOptions = {},
  nullMessage,
  onSelectedValueChange,
  onDone,
}: {
  message?: string;
  ungroupedOptions: ResettableSelectOption[];
  groupedOptions?: ResettableSelectGroupedOptions;
  nullMessage: string;
  onSelectedValueChange?: (selectedValues: string[]) => void;
  onDone: (selectedValues: string[]) => void;
}) => {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Record<string, boolean>>(() =>
    getInitialSelection(ungroupedOptions, groupedOptions),
  );

  const groupTitles = Object.keys(groupedOptions).sort((a, b) =>
    a.localeCompare(b),
  );

  const getSelectedValues = (currentSelection: Record<string, boolean>) => {
    const selectedValues = new Set<string>();

    ungroupedOptions.forEach((option, idx) => {
      if (currentSelection[ungroupedKey(idx)]) selectedValues.add(option.value);
    });

    for (const [groupTitle, options] of Object.entries(groupedOptions)) {
      options.forEach((option, idx) => {
        if (currentSelection[groupedKey(groupTitle, idx)]) {
          selectedValues.add(option.value);
        }
      });
    }

    return [...selectedValues];
  };

  const updateSelection = (nextSelection: Record<string, boolean>) => {
    setSelection(nextSelection);
    onSelectedValueChange?.(getSelectedValues(nextSelection));
  };

  const resetAll = () => {
    updateSelection(
      Object.fromEntries(Object.keys(selection).map((key) => [key, false])),
    );
  };

  const renderOption = (option: ResettableSelectOption, key: string) => (
    <Label
      key={key}
      className="min-h-11 border-b px-4 py-2 text-base leading-snug font-normal"
    >
      <Checkbox
        checked={!!selection[key]}
        onCheckedChange={(checked) =>
          updateSelection({ ...selection, [key]: checked })
        }
      />
      <span className="min-w-0 break-words whitespace-normal" dir="auto">
        {option.title}
      </span>
    </Label>
  );

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0 border-b px-2 py-1">
        <Button variant="ghost" className="text-primary" onClick={resetAll}>
          {t("pages.rselectpopover.resetAll")}
        </Button>
      </div>
      <div className="max-h-[400px] min-h-0 overflow-y-auto">
        {message && (
          <p className="px-4 py-3 text-sm text-muted-foreground">{message}</p>
        )}
        {ungroupedOptions.map((option, idx) =>
          renderOption(option, ungroupedKey(idx)),
        )}
        {groupTitles.map((groupTitle) => (
          <div key={groupTitle}>
            <div className="px-4 py-3" dir="auto">
              {groupTitle}
            </div>
            <div className="ps-4">
              {groupedOptions[groupTitle].map((option, idx) =>
                renderOption(option, groupedKey(groupTitle, idx)),
              )}
            </div>
          </div>
        ))}
        {!ungroupedOptions.length && !groupTitles.length && (
          <p className="px-4 py-3">{nullMessage}</p>
        )}
      </div>
      <div className="flex shrink-0 justify-end border-t px-2 py-2">
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => onDone(getSelectedValues(selection))}
        >
          {t("pages.rselectpopover.done")}
        </Button>
      </div>
    </div>
  );
};
