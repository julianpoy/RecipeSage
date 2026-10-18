import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Fraction from "fraction.js";
import { System } from "@recipesage/unitz-ts";
import {
  applyDecimalNotation,
  formatQuantity,
  getAnchorMeasurement,
  localeToPlainNumber,
  parseIngredients,
  parseYieldCount,
  stripIngredient,
  type AnchorMeasurement,
  type DecimalNotation,
  type ParsedIngredient,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "../../components/forms/TextField";
import type { DialogControls } from "../../components/dialogs/openDialog";

export type UnitSystem = "original" | "metric" | "imperial";

export interface ScaleRecipeResult {
  scale: string;
  unitSystem: UnitSystem;
}

export interface ScaleRecipeProps {
  scale?: string;
  unitSystem?: UnitSystem;
  yieldText?: string | null;
  ingredients?: ParsedIngredient[];
  decimalNotationMode?: DecimalNotation;
}

interface AnchorOption extends AnchorMeasurement {
  index: number;
  label: string;
}

const PRESETS = ["1/2", "1", "2", "3", "4"];

const UNIT_SYSTEMS: UnitSystem[] = ["original", "metric", "imperial"];

const isUnitSystem = (value: unknown): value is UnitSystem =>
  UNIT_SYSTEMS.some((unitSystem) => unitSystem === value);

const getTargetSystem = (unitSystem: UnitSystem): System | undefined => {
  if (unitSystem === "metric") return System.METRIC;
  if (unitSystem === "imperial") return System.US;
  return undefined;
};

export const ScaleRecipe = ({
  controls,
  scale: initialScale = "1",
  unitSystem: initialUnitSystem = "original",
  yieldText = null,
  ingredients = [],
  decimalNotationMode = ".",
}: ScaleRecipeProps & {
  controls: DialogControls<ScaleRecipeResult>;
}) => {
  const { t } = useTranslation();
  const anchorTriggerId = useId();
  const unitSystemTriggerId = useId();

  const toNumeric = (value: string | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    try {
      const parsed = new Fraction(
        localeToPlainNumber(trimmed, decimalNotationMode),
      ).valueOf();
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const [originalServings] = useState(() =>
    parseYieldCount(yieldText, decimalNotationMode),
  );

  const computeServings = (scaleStr: string): string | undefined => {
    if (originalServings === null) return undefined;
    const scaleValue = toNumeric(scaleStr) ?? 1;
    return formatQuantity(
      originalServings * scaleValue,
      decimalNotationMode,
      2,
    );
  };

  const computeAnchorQty = (
    scaleStr: string,
    index: number | null,
    system: UnitSystem,
  ): string | undefined => {
    if (index === null) return undefined;
    const ingredient = ingredients[index];
    if (!ingredient) return undefined;
    const trimmedScale = scaleStr.trim() || "1";
    if (toNumeric(trimmedScale) === null) return undefined;
    const parsed = parseIngredients(ingredient.originalContent, trimmedScale, {
      targetSystem: getTargetSystem(system),
      decimalNotationMode,
    });
    const measurement = getAnchorMeasurement(
      parsed[0]?.plaintextContent ?? "",
      decimalNotationMode,
    );
    if (!measurement) return undefined;
    return measurement.qtyText;
  };

  const [scale, setScale] = useState(() =>
    applyDecimalNotation(initialScale, decimalNotationMode),
  );
  const [unitSystem, setUnitSystem] = useState(initialUnitSystem);
  const [servingsInput, setServingsInput] = useState(
    () => computeServings(scale) ?? "",
  );
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);
  const [anchorQtyInput, setAnchorQtyInput] = useState("");

  const anchorOptions = useMemo(() => {
    const targetSystem = getTargetSystem(unitSystem);
    return ingredients
      .map((ingredient, index): AnchorOption | null => {
        if (ingredient.isHeader) return null;
        const sourceText =
          targetSystem !== undefined
            ? (parseIngredients(ingredient.originalContent, "1", {
                targetSystem,
                decimalNotationMode,
              })[0]?.plaintextContent ?? ingredient.originalContent)
            : ingredient.originalContent;
        const measurement = getAnchorMeasurement(
          sourceText,
          decimalNotationMode,
        );
        if (!measurement) return null;
        const name = stripIngredient(ingredient.originalContent).trim();
        if (!name) return null;
        return {
          index,
          label: name,
          qtyText: measurement.qtyText,
          qtyValue: measurement.qtyValue,
          unit: measurement.unit,
        };
      })
      .filter((option): option is AnchorOption => option !== null);
  }, [ingredients, unitSystem, decimalNotationMode]);

  const selectedAnchor =
    anchorIndex === null
      ? undefined
      : anchorOptions.find((candidate) => candidate.index === anchorIndex);

  const refreshFromScale = (
    newScale: string,
    opts: { skipServings?: boolean; skipAnchor?: boolean } = {},
  ) => {
    if (!opts.skipServings) {
      const servings = computeServings(newScale);
      if (servings !== undefined) setServingsInput(servings);
    }
    if (!opts.skipAnchor) {
      const anchorQty = computeAnchorQty(newScale, anchorIndex, unitSystem);
      if (anchorQty !== undefined) setAnchorQtyInput(anchorQty);
    }
  };

  const setScaleFromNumber = (
    value: number,
    opts: { skipServings?: boolean; skipAnchor?: boolean } = {},
  ) => {
    const newScale = new Fraction(value).toFraction(true);
    setScale(newScale);
    refreshFromScale(newScale, opts);
  };

  const setPresetScale = (preset: string) => {
    setScale(preset);
    refreshFromScale(preset);
  };

  const onScaleInput = (value: string) => {
    setScale(value);
    refreshFromScale(value);
  };

  const onUnitSystemChange = (value: UnitSystem) => {
    setUnitSystem(value);
    const anchorQty = computeAnchorQty(scale, anchorIndex, value);
    if (anchorQty !== undefined) setAnchorQtyInput(anchorQty);
  };

  const onServingsInput = (value: string) => {
    setServingsInput(value);
    if (originalServings === null) return;
    const desired = toNumeric(value);
    if (desired === null) return;
    setScaleFromNumber(desired / originalServings, {
      skipServings: true,
    });
  };

  const onAnchorIngredientChange = (index: number | null) => {
    setAnchorIndex(index);
    if (index === null) {
      setAnchorQtyInput("");
      return;
    }
    const anchorQty = computeAnchorQty(scale, index, unitSystem);
    if (anchorQty !== undefined) setAnchorQtyInput(anchorQty);
  };

  const onAnchorQtyInput = (value: string) => {
    setAnchorQtyInput(value);
    if (!selectedAnchor) return;
    const desired = toNumeric(value);
    if (desired === null) return;
    setScaleFromNumber(desired / selectedAnchor.qtyValue, {
      skipAnchor: true,
    });
  };

  const sanitizedScale = (): string => {
    const plain = localeToPlainNumber(scale, decimalNotationMode);
    try {
      if (new Fraction(plain).valueOf() <= 0) return "1";
      return plain;
    } catch {
      return "1";
    }
  };

  const apply = () => {
    controls.close({
      scale: sanitizedScale(),
      unitSystem,
    });
  };

  const unitSystemLabels: Record<UnitSystem, string> = {
    original: t("components.scaleRecipe.system.original"),
    metric: t("components.scaleRecipe.system.metric"),
    imperial: t("components.scaleRecipe.system.imperial"),
  };

  return (
    <Dialog
      open={controls.open}
      onOpenChange={(open) => {
        if (!open) controls.close();
      }}
      onOpenChangeComplete={(open) => {
        if (!open) controls.remove();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(500px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[400px]"
      >
        <div className="border-b px-4 py-4">
          <DialogTitle className="text-lg">
            {t("components.scaleRecipe.title")}
          </DialogTitle>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          <div>
            <p className="mb-1 text-xs">{t("components.scaleRecipe.click")}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  className="min-w-10"
                  onClick={() => setPresetScale(preset)}
                >
                  {t("components.scaleRecipe.presetMultiplier", {
                    value: preset,
                  })}
                </Button>
              ))}
            </div>
          </div>

          <TextField
            label={t("components.scaleRecipe.manual")}
            value={scale}
            onValueChange={onScaleInput}
            inputMode="decimal"
          />

          {originalServings !== null && (
            <TextField
              label={t("components.scaleRecipe.servingsLabel", {
                originalServings,
              })}
              value={servingsInput}
              onValueChange={onServingsInput}
              inputMode="decimal"
            />
          )}

          {anchorOptions.length > 0 && (
            <>
              <Field>
                <FieldLabel htmlFor={anchorTriggerId}>
                  {t("components.scaleRecipe.anchorLabel")}
                </FieldLabel>
                <Select
                  value={anchorIndex}
                  items={anchorOptions.map((option) => ({
                    value: option.index,
                    label: option.label,
                  }))}
                  onValueChange={(value) => {
                    onAnchorIngredientChange(
                      typeof value === "number" ? value : null,
                    );
                  }}
                >
                  <SelectTrigger id={anchorTriggerId} className="h-10 w-full">
                    <SelectValue
                      dir="auto"
                      placeholder={t(
                        "components.scaleRecipe.anchorPlaceholder",
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {anchorOptions.map((option) => (
                      <SelectItem key={option.index} value={option.index}>
                        <span dir="auto" className="whitespace-normal">
                          {option.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {selectedAnchor && (
                <div className="ms-8">
                  <TextField
                    label={
                      selectedAnchor.unit
                        ? t("components.scaleRecipe.anchorQty", {
                            unit: selectedAnchor.unit,
                            originalQty: selectedAnchor.qtyText,
                          })
                        : t("components.scaleRecipe.anchorQtyNoUnit", {
                            originalQty: selectedAnchor.qtyText,
                          })
                    }
                    value={anchorQtyInput}
                    onValueChange={onAnchorQtyInput}
                    inputMode="decimal"
                  />
                </div>
              )}
            </>
          )}

          <Field>
            <FieldLabel htmlFor={unitSystemTriggerId}>
              {t("components.scaleRecipe.systemLabel")}
            </FieldLabel>
            <Select
              value={unitSystem}
              items={UNIT_SYSTEMS.map((value) => ({
                value,
                label: unitSystemLabels[value],
              }))}
              onValueChange={(value) => {
                if (isUnitSystem(value)) onUnitSystemChange(value);
              }}
            >
              <SelectTrigger id={unitSystemTriggerId} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UNIT_SYSTEMS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {unitSystemLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <Button variant="ghost" onClick={() => controls.close()}>
            {t("components.scaleRecipe.cancel")}
          </Button>
          <Button variant="ghost" className="text-primary" onClick={apply}>
            {t("components.scaleRecipe.apply")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
