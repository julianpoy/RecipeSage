import { useState } from "react";
import { BanIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#eb445a",
  "#ff7f50",
  "#ffc409",
  "#2dd36f",
  "#3dc2ff",
  "#6a64ff",
  "#e040fb",
  "#795548",
  "#92949c",
  "#222428",
];

const HEX_COLOR_RE = /^[0-9a-fA-F]{6}$/;

export const ColorPicker = ({
  color,
  onColorChange,
  onPresetSelected,
}: {
  color: string | null;
  onColorChange?: (color: string | null) => void;
  onPresetSelected?: (color: string | null) => void;
}) => {
  const { t } = useTranslation();
  const [customHexValue, setCustomHexValue] = useState("");

  const selectColor = (newColor: string | null) => {
    setCustomHexValue("");
    onColorChange?.(newColor);
    onPresetSelected?.(newColor);
  };

  const onCustomHexInput = (value: string) => {
    setCustomHexValue(value);
    const hex = value.replace("#", "").trim();
    if (HEX_COLOR_RE.test(hex)) {
      onColorChange?.(`#${hex.toLowerCase()}`);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={preset}
            aria-pressed={color === preset}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-transparent p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              color === preset && "border-foreground",
            )}
            style={{ backgroundColor: preset }}
            onClick={() => selectColor(preset)}
          />
        ))}
        <button
          type="button"
          aria-label={t("components.colorPicker.noColor")}
          aria-pressed={!color}
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-background p-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            !color && "border-foreground",
          )}
          onClick={() => selectColor(null)}
        >
          <BanIcon className="size-[18px] text-muted-foreground" />
        </button>
      </div>
      <InputGroup dir="ltr" className="mt-2 max-w-[140px]">
        <InputGroupAddon>#</InputGroupAddon>
        <InputGroupInput
          dir="ltr"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ff6600"
          maxLength={6}
          value={customHexValue}
          onChange={(event) => onCustomHexInput(event.target.value)}
        />
      </InputGroup>
    </div>
  );
};
