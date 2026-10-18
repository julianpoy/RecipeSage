import { useTranslation } from "react-i18next";
import {
  CircleIcon,
  DiscIcon,
  DonutIcon,
  Grid2x2Icon,
  InboxIcon,
  LayersIcon,
  RectangleHorizontalIcon,
  SquareIcon,
  type LucideIcon,
} from "lucide-react";
import { TextField } from "../../../components/forms/TextField";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import type { PanPreset, PanShape } from "./panBakewareData";
import { ToggleChip } from "./ToggleChip";

export interface PanState {
  shape: PanShape;
  selectedPresetKey: string | null;
  diameter: string;
  length: string;
  width: string;
  depth: string;
  cavities: string;
  cavityCapacity: string;
  capacityOverride: string;
}

export type PanField =
  | "diameter"
  | "length"
  | "width"
  | "depth"
  | "cavities"
  | "cavityCapacity"
  | "capacityOverride";

interface ShapeOption {
  key: PanShape;
  icon: LucideIcon;
}

const SHAPE_OPTIONS: ShapeOption[] = [
  { key: "round", icon: CircleIcon },
  { key: "square", icon: SquareIcon },
  { key: "rectangular", icon: RectangleHorizontalIcon },
  { key: "loaf", icon: InboxIcon },
  { key: "springform", icon: DiscIcon },
  { key: "sheet", icon: LayersIcon },
  { key: "bundtTube", icon: DonutIcon },
  { key: "muffin", icon: Grid2x2Icon },
];

export const SHAPE_LABEL_KEYS: Record<PanShape, TranslationKey> = {
  round: "pages.panBakewareConverter.shapes.round",
  square: "pages.panBakewareConverter.shapes.square",
  rectangular: "pages.panBakewareConverter.shapes.rectangular",
  loaf: "pages.panBakewareConverter.shapes.loaf",
  springform: "pages.panBakewareConverter.shapes.springform",
  sheet: "pages.panBakewareConverter.shapes.sheet",
  bundtTube: "pages.panBakewareConverter.shapes.bundtTube",
  muffin: "pages.panBakewareConverter.shapes.muffin",
};

const DimensionRow = ({
  label,
  value,
  inputMode,
  suffix,
  onValueChange,
}: {
  label: string;
  value: string;
  inputMode: "decimal" | "numeric";
  suffix?: string;
  onValueChange: (value: string) => void;
}) => (
  <div className="flex min-h-14 items-center gap-2 border-b py-2">
    <span className="min-w-0 flex-1 break-words">{label}</span>
    <div className="w-[104px] shrink-0">
      <TextField
        aria-label={label}
        className="text-end"
        type="text"
        inputMode={inputMode}
        value={value}
        onValueChange={onValueChange}
      />
    </div>
    {suffix !== undefined && (
      <span className="ms-1.5 shrink-0 text-[0.8rem] text-muted-foreground">
        {suffix}
      </span>
    )}
  </div>
);

export const PanCard = ({
  headingId,
  eyebrow,
  title,
  state,
  presets,
  presetLabel,
  unitLabelShort,
  capacityUnitLabel,
  cavityUnitLabel,
  areaLabel,
  capacityLabel,
  onShapeChange,
  onPresetSelect,
  onFieldChange,
}: {
  headingId: string;
  eyebrow: string;
  title: string;
  state: PanState;
  presets: PanPreset[];
  presetLabel: (preset: PanPreset) => string;
  unitLabelShort: string;
  capacityUnitLabel: string;
  cavityUnitLabel: string;
  areaLabel: string;
  capacityLabel: string;
  onShapeChange: (shape: PanShape) => void;
  onPresetSelect: (presetKey: string) => void;
  onFieldChange: (field: PanField, value: string) => void;
}) => {
  const { t } = useTranslation();
  const shape = state.shape;

  return (
    <section
      aria-labelledby={headingId}
      className="mb-4 rounded-xl border bg-background p-4"
    >
      <header className="mb-3">
        <p className="text-[0.72rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 id={headingId} className="mt-0.5 text-[1.1rem] font-bold">
          {title}
        </h2>
      </header>

      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {SHAPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <ToggleChip
              key={option.key}
              className="h-8 ps-2"
              pressed={shape === option.key}
              onClick={() => onShapeChange(option.key)}
              icon={<Icon aria-hidden="true" />}
            >
              {t(SHAPE_LABEL_KEYS[option.key])}
            </ToggleChip>
          );
        })}
      </div>

      {presets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <ToggleChip
              key={preset.key}
              className="h-7 text-[0.78rem]"
              pressed={state.selectedPresetKey === preset.key}
              onClick={() => onPresetSelect(preset.key)}
            >
              {presetLabel(preset)}
            </ToggleChip>
          ))}
        </div>
      )}

      <div className="mb-3">
        {(shape === "round" || shape === "springform") && (
          <DimensionRow
            label={t("pages.panBakewareConverter.field.diameter")}
            value={state.diameter}
            inputMode="decimal"
            suffix={unitLabelShort}
            onValueChange={(value) => onFieldChange("diameter", value)}
          />
        )}
        {shape === "square" && (
          <DimensionRow
            label={t("pages.panBakewareConverter.field.side")}
            value={state.length}
            inputMode="decimal"
            suffix={unitLabelShort}
            onValueChange={(value) => onFieldChange("length", value)}
          />
        )}
        {(shape === "rectangular" || shape === "loaf" || shape === "sheet") && (
          <>
            <DimensionRow
              label={t("pages.panBakewareConverter.field.length")}
              value={state.length}
              inputMode="decimal"
              suffix={unitLabelShort}
              onValueChange={(value) => onFieldChange("length", value)}
            />
            <DimensionRow
              label={t("pages.panBakewareConverter.field.width")}
              value={state.width}
              inputMode="decimal"
              suffix={unitLabelShort}
              onValueChange={(value) => onFieldChange("width", value)}
            />
          </>
        )}
        {shape === "bundtTube" && (
          <DimensionRow
            label={t("pages.panBakewareConverter.field.capacityCups")}
            value={state.capacityOverride}
            inputMode="decimal"
            suffix={capacityUnitLabel}
            onValueChange={(value) => onFieldChange("capacityOverride", value)}
          />
        )}
        {shape === "muffin" && (
          <>
            <DimensionRow
              label={t("pages.panBakewareConverter.field.cavities")}
              value={state.cavities}
              inputMode="numeric"
              onValueChange={(value) => onFieldChange("cavities", value)}
            />
            <DimensionRow
              label={t("pages.panBakewareConverter.field.cavityCapacity")}
              value={state.cavityCapacity}
              inputMode="decimal"
              suffix={cavityUnitLabel}
              onValueChange={(value) => onFieldChange("cavityCapacity", value)}
            />
          </>
        )}
        {shape !== "bundtTube" && shape !== "muffin" && (
          <DimensionRow
            label={t("pages.panBakewareConverter.field.depth")}
            value={state.depth}
            inputMode="decimal"
            suffix={unitLabelShort}
            onValueChange={(value) => onFieldChange("depth", value)}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.7rem] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            {t("pages.panBakewareConverter.area.label")}
          </span>
          <span className="text-[0.92rem] font-semibold tabular-nums">
            {areaLabel}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[0.7rem] font-semibold tracking-[0.05em] text-muted-foreground uppercase">
            {t("pages.panBakewareConverter.capacity.label")}
          </span>
          <span className="text-[0.92rem] font-semibold tabular-nums">
            {capacityLabel}
          </span>
        </div>
      </div>
    </section>
  );
};
