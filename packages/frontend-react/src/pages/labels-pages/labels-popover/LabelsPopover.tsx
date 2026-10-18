import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontalIcon } from "lucide-react";
import { ManageLabelsPreferenceKey } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import {
  QuickTutorialOptions,
  quickTutorialService,
} from "../../../services/quickTutorialService";
import { preferencesStore } from "../../../stores/preferencesStore";

export const LabelsPopover = ({
  selectionMode,
  onSelectionModeChange,
}: {
  selectionMode: boolean;
  onSelectionModeChange: (selectionMode: boolean) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const showCreatedAt = preferencesStore(
    (state) => state.preferences[ManageLabelsPreferenceKey.ShowCreatedAt],
  );
  const setPreference = preferencesStore((state) => state.setPreference);

  const toggleSelectionMode = () => {
    const enteringSelectionMode = !selectionMode;
    if (enteringSelectionMode) {
      void quickTutorialService.triggerQuickTutorial(
        QuickTutorialOptions.MultipleLabelSelection,
      );
    }

    setOpen(false);
    onSelectionModeChange(enteringSelectionMode);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
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
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 max-w-[calc(100vw-2rem)] gap-0 p-0"
      >
        <PopoverTitle className="px-4 pt-4 pb-2 text-sm font-medium text-muted-foreground">
          {t("pages.labelsPopover.title")}
        </PopoverTitle>
        <div className="flex min-h-12 items-center border-b px-4 py-2">
          <Label className="flex-1 justify-between gap-4 text-base leading-snug font-normal">
            <span className="min-w-0 whitespace-normal">
              {t("pages.labelsPopover.options.showCreatedAt")}
            </span>
            <Switch
              checked={showCreatedAt}
              onCheckedChange={(checked) => {
                setPreference(ManageLabelsPreferenceKey.ShowCreatedAt, checked);
                setOpen(false);
              }}
            />
          </Label>
        </div>
        <div className="p-4">
          <Button className="w-full" onClick={toggleSelectionMode}>
            <span className="whitespace-normal">
              {selectionMode
                ? t("pages.labelsPopover.options.unselectLabels")
                : t("pages.labelsPopover.options.selectMultipleLabels")}
            </span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
