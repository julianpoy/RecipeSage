import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { CheckIcon, CircleXIcon, GripVerticalIcon, XIcon } from "lucide-react";
import {
  DEFAULT_MEALS,
  DEFAULT_MEAL_COLORS,
  capitalizeEachWord,
  parseCustomMealOptions,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ColorPicker } from "../../../components/color-picker/ColorPicker";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextField } from "../../../components/forms/TextField";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";

interface MealOptionEntry {
  id: string;
  name: string;
  color: string | null;
  isDefault: boolean;
}

export interface MealPlanMealOrderModalResult {
  customMealOptions: string | null;
}

let nextEntryId = 0;

const createEntry = (
  name: string,
  color: string | null,
  isDefault: boolean,
): MealOptionEntry => ({
  id: `meal-option-${nextEntryId++}`,
  name,
  color,
  isDefault,
});

const buildInitialEntries = (customMealOptions: string | undefined) => {
  const parsed = parseCustomMealOptions(customMealOptions);
  const entries =
    parsed.length > 0
      ? parsed.map((e) =>
          createEntry(
            e.name,
            e.color || DEFAULT_MEAL_COLORS[e.name.toLowerCase()] || null,
            DEFAULT_MEALS.includes(e.name.toLowerCase()),
          ),
        )
      : DEFAULT_MEALS.map((meal) =>
          createEntry(
            capitalizeEachWord(meal),
            DEFAULT_MEAL_COLORS[meal],
            true,
          ),
        );
  entries.push(createEntry("", null, false));
  return entries;
};

const MealEntryRow = ({
  entry,
  index,
  sortable,
  colorPickerOpen,
  onToggleColorPicker,
  onNameChange,
  onInputFocus,
  onRemove,
  onColorChange,
  onPresetSelected,
}: {
  entry: MealOptionEntry;
  index: number;
  sortable: boolean;
  colorPickerOpen: boolean;
  onToggleColorPicker: () => void;
  onNameChange: (name: string) => void;
  onInputFocus: () => void;
  onRemove: () => void;
  onColorChange: (color: string | null) => void;
  onPresetSelected: () => void;
}) => {
  const { t } = useTranslation();
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const { ref, handleRef, isDragging } = useSortable({
    id: entry.id,
    index,
    disabled: !sortable,
  });

  useEffect(() => {
    if (!colorPickerOpen) return;
    const timeout = setTimeout(() => {
      colorPickerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    return () => clearTimeout(timeout);
  }, [colorPickerOpen]);

  return (
    <div
      ref={sortable ? ref : undefined}
      className={cn(
        "rounded-xl bg-background",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <button
          type="button"
          aria-label={t("pages.mealPlanMealOrderModal.chooseColor")}
          aria-expanded={colorPickerOpen}
          className={cn(
            "mb-0.5 size-7 min-w-7 shrink-0 cursor-pointer self-end rounded-full border-2 p-0",
            entry.color
              ? "border-transparent"
              : "border-dashed border-border bg-background",
          )}
          style={entry.color ? { backgroundColor: entry.color } : undefined}
          onClick={onToggleColorPicker}
        />
        <div className="min-w-0 flex-1">
          <TextField
            label={t("pages.mealPlanMealOrderModal.entryPlaceholder")}
            value={entry.name}
            onValueChange={onNameChange}
            onFocus={onInputFocus}
            type="text"
            disabled={entry.isDefault}
          />
        </div>
        {sortable && (
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              className="self-end text-muted-foreground"
              aria-label={t("generic.delete")}
              disabled={entry.isDefault}
              onClick={onRemove}
            >
              <CircleXIcon className="size-5" />
            </Button>
            <button
              type="button"
              ref={handleRef}
              aria-label={t("generic.reorder")}
              className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center self-end rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing"
            >
              <GripVerticalIcon className="size-5" />
            </button>
          </>
        )}
      </div>

      {colorPickerOpen && (
        <div ref={colorPickerRef} className="pt-2 pb-3 ps-9">
          <ColorPicker
            color={entry.color}
            onColorChange={onColorChange}
            onPresetSelected={onPresetSelected}
          />
        </div>
      )}
    </div>
  );
};

export const MealPlanMealOrderModal = ({
  controls,
  customMealOptions,
}: {
  controls: DialogControls<MealPlanMealOrderModalResult>;
  customMealOptions?: string;
}) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(() =>
    buildInitialEntries(customMealOptions),
  );
  const [openColorPickerIndex, setOpenColorPickerIndex] = useState<
    number | null
  >(null);

  const lastIndex = entries.length - 1;

  const onEntryNameChange = (index: number, name: string) => {
    setEntries((prev) => {
      const next = prev.map((entry, idx) =>
        idx === index ? { ...entry, name } : entry,
      );
      if (index === next.length - 1 && name.trim()) {
        next.push(createEntry("", null, false));
      }
      return next;
    });
  };

  const onReorder = (from: number, requestedTo: number) => {
    const to = Math.min(requestedTo, lastIndex - 1);

    if (from === lastIndex || from === to) return;

    setEntries((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

    if (openColorPickerIndex !== null) {
      if (openColorPickerIndex === from) {
        setOpenColorPickerIndex(to);
      } else if (from < openColorPickerIndex && to >= openColorPickerIndex) {
        setOpenColorPickerIndex(openColorPickerIndex - 1);
      } else if (from > openColorPickerIndex && to <= openColorPickerIndex) {
        setOpenColorPickerIndex(openColorPickerIndex + 1);
      }
    }
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, idx) => idx !== index));
    if (openColorPickerIndex === index) {
      setOpenColorPickerIndex(null);
    } else if (openColorPickerIndex !== null && openColorPickerIndex > index) {
      setOpenColorPickerIndex(openColorPickerIndex - 1);
    }
  };

  const toggleColorPicker = (index: number) => {
    setOpenColorPickerIndex(openColorPickerIndex === index ? null : index);
  };

  const onColorChange = (index: number, color: string | null) => {
    setEntries((prev) => {
      const next = prev.map((entry, idx) =>
        idx === index ? { ...entry, color } : entry,
      );
      if (index === next.length - 1 && color) {
        next.push(createEntry("", null, false));
      }
      return next;
    });
  };

  const closeColorPicker = () => {
    setOpenColorPickerIndex(null);
  };

  const save = () => {
    const lines = entries
      .filter((e) => e.name.trim())
      .map((e) => {
        const name = e.name.trim();
        if (e.color) return `${e.color} ${name}`;
        return name;
      });

    controls.close({
      customMealOptions: lines.length > 0 ? lines.join("\n") : null,
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.mealPlanMealOrderModal.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent className="pb-16">
        <p className="mb-4">{t("pages.mealPlanMealOrderModal.description")}</p>

        <DragDropProvider
          onDragEnd={(event) => {
            if (event.canceled) return;
            const { source } = event.operation;
            if (!isSortable(source)) return;
            onReorder(source.initialIndex, source.index);
          }}
        >
          <div className="flex flex-col gap-1">
            {entries.map((entry, index) => (
              <MealEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                sortable={index < lastIndex}
                colorPickerOpen={openColorPickerIndex === index}
                onToggleColorPicker={() => toggleColorPicker(index)}
                onNameChange={(name) => onEntryNameChange(index, name)}
                onInputFocus={closeColorPicker}
                onRemove={() => removeEntry(index)}
                onColorChange={(color) => onColorChange(index, color)}
                onPresetSelected={closeColorPicker}
              />
            ))}
          </div>
        </DragDropProvider>
      </PageContent>
      <PageFooter className="p-4">
        <Button size="lg" className="w-full" onClick={save}>
          <CheckIcon data-icon="inline-start" />
          {t("generic.done")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
