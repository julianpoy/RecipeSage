import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDownIcon, ChevronRightIcon, LightbulbIcon } from "lucide-react";
import {
  COUNT_ITEMS,
  INGREDIENT_DENSITIES,
  MeasurementConverterPreferenceKey,
  OVEN_TEMPERATURES,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  buildPanel,
  celsiusToFahrenheit,
  convertWeight,
  fahrenheitToCelsius,
  fahrenheitToGasMark,
  formatDecimal,
  formatFraction,
  gasMarkToFahrenheit,
  getIngredientByKey,
  getIngredientGramsPerMl,
  isVolumeUnit,
  parseQuantity,
  volumeToWeight,
  type VolumeUnit,
  type WeightUnit,
} from "@recipesage/util/shared";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextField } from "../../../components/forms/TextField";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { openSearchableSelectModal } from "../../../components/searchable-select-modal/openSearchableSelectModal";
import { preferencesStore } from "../../../stores/preferencesStore";
import { getCurrentLocale } from "../../../utils/formatDate";
import { MeasurementConverterPopover } from "../measurement-converter-popover/MeasurementConverterPopover";
import { measurementConverterI18nKeys } from "./measurementConverterI18nKeys";

type Mode = "ingredients" | "count" | "temperature";

type TemperatureField = "celsius" | "fahrenheit" | "gasMark";

const MODES: Mode[] = ["ingredients", "count", "temperature"];

const isMode = (value: unknown): value is Mode =>
  MODES.some((mode) => mode === value);

const FRACTION_VOLUME_UNITS: VolumeUnit[] = ["cup", "tablespoon", "teaspoon"];

const createVolumeValues = (): Record<VolumeUnit, string> => ({
  cup: "",
  tablespoon: "",
  teaspoon: "",
  fluidOunce: "",
  milliliter: "",
  liter: "",
  pint: "",
  quart: "",
  gallon: "",
  deciliter: "",
  centiliter: "",
  imperialCup: "",
  imperialPint: "",
  imperialFluidOunce: "",
});

const createWeightValues = (): Record<WeightUnit, string> => ({
  gram: "",
  kilogram: "",
  ounce: "",
  pound: "",
  milligram: "",
  stone: "",
});

const formatVolume = (unit: VolumeUnit, value: number): string => {
  if (FRACTION_VOLUME_UNITS.includes(unit)) {
    return formatFraction(value, getCurrentLocale());
  }
  return formatDecimal(value, getCurrentLocale());
};

const currentGramsPerMl = (ingredientKey: string): number | null => {
  const ingredient = getIngredientByKey(ingredientKey);
  return ingredient ? getIngredientGramsPerMl(ingredient) : null;
};

interface PanelValues {
  volumeValues: Record<VolumeUnit, string>;
  weightValues: Record<WeightUnit, string>;
}

const recomputePanel = (
  unit: VolumeUnit | WeightUnit,
  values: PanelValues,
  ingredientKey: string,
): PanelValues => {
  const raw = isVolumeUnit(unit)
    ? values.volumeValues[unit]
    : values.weightValues[unit];
  const value = parseQuantity(raw, getCurrentLocale());
  if (value === null && raw.trim().length > 0) return values;

  const panel =
    value === null || value <= 0
      ? null
      : buildPanel(value, unit, currentGramsPerMl(ingredientKey));

  const volumeValues = { ...values.volumeValues };
  for (const volumeUnit of VOLUME_UNITS) {
    if (volumeUnit === unit) continue;
    volumeValues[volumeUnit] = panel?.volumes
      ? formatVolume(volumeUnit, panel.volumes[volumeUnit])
      : "";
  }

  const weightValues = { ...values.weightValues };
  for (const weightUnit of WEIGHT_UNITS) {
    if (weightUnit === unit) continue;
    weightValues[weightUnit] = panel?.weights
      ? formatDecimal(panel.weights[weightUnit], getCurrentLocale())
      : "";
  }

  return { volumeValues, weightValues };
};

const computeCountWeights = (
  rawQuantity: string,
  countItemKey: string,
): Record<WeightUnit, string> | null => {
  const quantity = parseQuantity(rawQuantity, getCurrentLocale());
  if (quantity === null && rawQuantity.trim().length > 0) return null;

  const item = COUNT_ITEMS.find((entry) => entry.key === countItemKey);
  const grams =
    quantity === null || quantity <= 0 || !item
      ? null
      : quantity * item.gramsPerUnit;

  const countWeightValues = createWeightValues();
  for (const weightUnit of WEIGHT_UNITS) {
    countWeightValues[weightUnit] =
      grams === null
        ? ""
        : formatDecimal(
            convertWeight(grams, "gram", weightUnit),
            getCurrentLocale(),
          );
  }
  return countWeightValues;
};

const createInitialPanel = (): PanelValues =>
  recomputePanel(
    "cup",
    {
      volumeValues: { ...createVolumeValues(), cup: "1" },
      weightValues: createWeightValues(),
    },
    "water",
  );

const ValueRow = ({
  label,
  value,
  onValueChange,
  suffix,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  suffix?: string;
}) => (
  <div className="flex min-h-14 items-center gap-2 border-b py-2 ps-4 pe-4">
    <span className="min-w-0 flex-1 break-words">{label}</span>
    <div className="w-[140px] shrink-0">
      <TextField
        aria-label={label}
        className="text-end"
        type="text"
        inputMode="decimal"
        value={value}
        onValueChange={onValueChange}
      />
    </div>
    {suffix !== undefined && (
      <span className="w-[30px] shrink-0 text-start text-[0.8rem] [overflow-wrap:anywhere] text-muted-foreground">
        {suffix}
      </span>
    )}
  </div>
);

const ListHeader = ({ children }: { children: ReactNode }) => (
  <h2 className="px-4 pt-5 pb-1 text-lg font-semibold">{children}</h2>
);

export const MeasurementConverterPage = () => {
  const { t } = useTranslation();
  const countItemTriggerId = useId();

  const enabledUnits = preferencesStore(
    (state) =>
      state.preferences[MeasurementConverterPreferenceKey.EnabledUnits],
  );

  const [mode, setMode] = useState<Mode>("ingredients");
  const [selectedIngredientKey, setSelectedIngredientKey] = useState("water");
  const [activeUnit, setActiveUnit] = useState<VolumeUnit | WeightUnit>("cup");
  const [panelValues, setPanelValues] =
    useState<PanelValues>(createInitialPanel);

  const [countItemKey, setCountItemKey] = useState("egg");
  const [countQuantity, setCountQuantity] = useState("1");
  const [countWeightValues, setCountWeightValues] = useState<
    Record<WeightUnit, string>
  >(() => computeCountWeights("1", "egg") ?? createWeightValues());

  const [tempCelsius, setTempCelsius] = useState("177");
  const [tempFahrenheit, setTempFahrenheit] = useState("350");
  const [tempGasMark, setTempGasMark] = useState("4");

  const visibleVolumeUnits = VOLUME_UNITS.filter((unit) =>
    enabledUnits.includes(unit),
  );
  const visibleWeightUnits = WEIGHT_UNITS.filter((unit) =>
    enabledUnits.includes(unit),
  );

  const shortUnitLabel = (unit: string): string => {
    const key = measurementConverterI18nKeys.unitsShort[unit];
    return key ? t(key) : "";
  };

  const ingredientName = (key: string): string => {
    const i18nKey = measurementConverterI18nKeys.ingredients[key];
    return i18nKey ? t(i18nKey) : key;
  };

  const countItemName = (key: string): string => {
    const i18nKey = measurementConverterI18nKeys.countItems[key];
    return i18nKey ? t(i18nKey) : key;
  };

  const selectedIngredientVaries =
    getIngredientByKey(selectedIngredientKey)?.varies ?? false;

  const basisGramsPerMl = currentGramsPerMl(selectedIngredientKey);
  const basisGrams =
    basisGramsPerMl === null
      ? ""
      : formatDecimal(
          volumeToWeight(1, "cup", "gram", basisGramsPerMl),
          getCurrentLocale(),
        );

  const countItemVaries =
    COUNT_ITEMS.find((item) => item.key === countItemKey)?.varies ?? false;

  const onVolumeInput = (unit: VolumeUnit, value: string) => {
    setActiveUnit(unit);
    setPanelValues((prev) =>
      recomputePanel(
        unit,
        { ...prev, volumeValues: { ...prev.volumeValues, [unit]: value } },
        selectedIngredientKey,
      ),
    );
  };

  const onWeightInput = (unit: WeightUnit, value: string) => {
    setActiveUnit(unit);
    setPanelValues((prev) =>
      recomputePanel(
        unit,
        { ...prev, weightValues: { ...prev.weightValues, [unit]: value } },
        selectedIngredientKey,
      ),
    );
  };

  const openIngredientPicker = async () => {
    const options = INGREDIENT_DENSITIES.map((ingredient) => ({
      value: ingredient.key,
      label: ingredientName(ingredient.key),
    })).sort((a, b) => a.label.localeCompare(b.label));

    const data = await openSearchableSelectModal({
      title: t("pages.measurementConverter.selectIngredient"),
      searchPlaceholder: t("pages.measurementConverter.searchPlaceholder"),
      noResultsText: t("pages.measurementConverter.noResults"),
      options,
      selectedValue: selectedIngredientKey,
    });
    if (!data) return;

    setSelectedIngredientKey(data.value);
    setPanelValues((prev) => recomputePanel(activeUnit, prev, data.value));
  };

  const onCountInput = (rawQuantity: string, itemKey: string) => {
    const next = computeCountWeights(rawQuantity, itemKey);
    if (next) setCountWeightValues(next);
  };

  const onCountWeightInput = (unit: WeightUnit, raw: string) => {
    const nextWeights = { ...countWeightValues, [unit]: raw };

    const value = parseQuantity(raw, getCurrentLocale());
    if (value === null && raw.trim().length > 0) {
      setCountWeightValues(nextWeights);
      return;
    }

    const item = COUNT_ITEMS.find((entry) => entry.key === countItemKey);
    const grams =
      value === null || value <= 0 || !item
        ? null
        : convertWeight(value, unit, "gram");

    setCountQuantity(
      grams === null || !item
        ? ""
        : formatDecimal(grams / item.gramsPerUnit, getCurrentLocale()),
    );

    for (const weightUnit of WEIGHT_UNITS) {
      if (weightUnit === unit) continue;
      nextWeights[weightUnit] =
        grams === null
          ? ""
          : formatDecimal(
              convertWeight(grams, "gram", weightUnit),
              getCurrentLocale(),
            );
    }
    setCountWeightValues(nextWeights);
  };

  const onTemperatureInput = (field: TemperatureField, raw: string) => {
    const locale = getCurrentLocale();
    const formatInt = (n: number) =>
      Math.round(n).toLocaleString(locale, {
        useGrouping: false,
      });
    const formatGasMark = (fahrenheit: number) => {
      const mark = fahrenheitToGasMark(fahrenheit);
      return mark === null ? "" : formatInt(mark);
    };

    if (field === "celsius") {
      setTempCelsius(raw);
      const celsius = parseQuantity(raw, locale);
      if (celsius === null) return;
      const fahrenheit = celsiusToFahrenheit(celsius);
      setTempFahrenheit(formatInt(fahrenheit));
      setTempGasMark(formatGasMark(fahrenheit));
    } else if (field === "fahrenheit") {
      setTempFahrenheit(raw);
      const fahrenheit = parseQuantity(raw, locale);
      if (fahrenheit === null) return;
      setTempCelsius(formatInt(fahrenheitToCelsius(fahrenheit)));
      setTempGasMark(formatGasMark(fahrenheit));
    } else {
      setTempGasMark(raw);
      const mark = parseQuantity(raw, locale);
      if (mark === null) return;
      const fahrenheit = gasMarkToFahrenheit(mark);
      if (fahrenheit === null) {
        setTempFahrenheit("");
        setTempCelsius("");
        return;
      }
      setTempFahrenheit(formatInt(fahrenheit));
      setTempCelsius(formatInt(fahrenheitToCelsius(fahrenheit)));
    }
  };

  const weightRows = (
    values: Record<WeightUnit, string>,
    onInput: (unit: WeightUnit, value: string) => void,
  ) =>
    visibleWeightUnits.map((unit) => (
      <ValueRow
        key={unit}
        label={t(measurementConverterI18nKeys.units[unit])}
        value={values[unit]}
        onValueChange={(value) => onInput(unit, value)}
        suffix={shortUnitLabel(unit)}
      />
    ));

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.measurementConverter.title")}
        end={<MeasurementConverterPopover />}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-[25vh]">
          <InfoBlock
            className="m-4"
            icon={<LightbulbIcon />}
            title={t("pages.measurementConverter.intro.title")}
          >
            <p>{t("pages.measurementConverter.intro.body")}</p>
            <p>{t("pages.measurementConverter.intro.bridgeHint")}</p>
          </InfoBlock>

          <Tabs
            className="mt-3 px-4"
            value={mode}
            onValueChange={(value) => {
              if (isMode(value)) setMode(value);
            }}
          >
            <TabsList className="h-auto min-h-10 w-full">
              <TabsTrigger value="ingredients" className="whitespace-normal">
                {t("pages.measurementConverter.mode.ingredients")}
              </TabsTrigger>
              <TabsTrigger value="count" className="whitespace-normal">
                {t("pages.measurementConverter.mode.count")}
              </TabsTrigger>
              <TabsTrigger value="temperature" className="whitespace-normal">
                {t("pages.measurementConverter.mode.temperature")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "ingredients" && (
            <>
              <section>
                <ListHeader>
                  {t("pages.measurementConverter.volume")}
                </ListHeader>
                {visibleVolumeUnits.map((unit) => (
                  <ValueRow
                    key={unit}
                    label={t(measurementConverterI18nKeys.units[unit])}
                    value={panelValues.volumeValues[unit]}
                    onValueChange={(value) => onVolumeInput(unit, value)}
                    suffix={shortUnitLabel(unit)}
                  />
                ))}
              </section>

              <button
                type="button"
                className="my-2 flex w-full items-center gap-4 bg-muted/60 px-4 py-3 text-start hover:bg-muted"
                aria-label={t("pages.measurementConverter.selectIngredient")}
                aria-haspopup="dialog"
                onClick={() => void openIngredientPicker()}
              >
                <ArrowUpDownIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.72rem] tracking-[0.04em] text-muted-foreground uppercase">
                    {t("pages.measurementConverter.bridgeScope")}
                  </p>
                  <p className="my-0.5 text-[1.1rem] font-semibold">
                    {ingredientName(selectedIngredientKey)}
                  </p>
                  <p className="text-[0.8rem] text-muted-foreground">
                    {t("pages.measurementConverter.basis", {
                      grams: basisGrams,
                    })}
                  </p>
                </div>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground rtl:rotate-180"
                />
              </button>

              <section>
                <ListHeader>
                  {t("pages.measurementConverter.weight")}
                </ListHeader>
                {weightRows(panelValues.weightValues, onWeightInput)}
              </section>

              {selectedIngredientVaries && (
                <p className="px-4 pt-2 text-[0.78rem] text-muted-foreground">
                  {t("pages.measurementConverter.variesNote")}
                </p>
              )}
            </>
          )}

          {mode === "count" && (
            <>
              <section className="mt-3">
                <div className="border-b px-4 py-3">
                  <Field>
                    <FieldLabel htmlFor={countItemTriggerId}>
                      {t("pages.measurementConverter.countItem")}
                    </FieldLabel>
                    <Select
                      value={countItemKey}
                      items={COUNT_ITEMS.map((item) => ({
                        value: item.key,
                        label: countItemName(item.key),
                      }))}
                      onValueChange={(value) => {
                        if (typeof value !== "string") return;
                        setCountItemKey(value);
                        onCountInput(countQuantity, value);
                      }}
                    >
                      <SelectTrigger
                        id={countItemTriggerId}
                        className="h-10 w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNT_ITEMS.map((item) => (
                          <SelectItem key={item.key} value={item.key}>
                            {countItemName(item.key)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <ValueRow
                  label={t("pages.measurementConverter.quantity")}
                  value={countQuantity}
                  onValueChange={(value) => {
                    setCountQuantity(value);
                    onCountInput(value, countItemKey);
                  }}
                />
              </section>

              <section>
                <ListHeader>
                  {t("pages.measurementConverter.weight")}
                </ListHeader>
                {weightRows(countWeightValues, onCountWeightInput)}
              </section>

              {countItemVaries && (
                <p className="px-4 pt-2 text-[0.78rem] text-muted-foreground">
                  {t("pages.measurementConverter.variesNote")}
                </p>
              )}
            </>
          )}

          {mode === "temperature" && (
            <>
              <section className="mt-3">
                <ValueRow
                  label={t("pages.measurementConverter.temperature.fahrenheit")}
                  value={tempFahrenheit}
                  onValueChange={(value) =>
                    onTemperatureInput("fahrenheit", value)
                  }
                  suffix={shortUnitLabel("fahrenheit")}
                />
                <ValueRow
                  label={t("pages.measurementConverter.temperature.celsius")}
                  value={tempCelsius}
                  onValueChange={(value) =>
                    onTemperatureInput("celsius", value)
                  }
                  suffix={shortUnitLabel("celsius")}
                />
                <ValueRow
                  label={t("pages.measurementConverter.temperature.gasMark")}
                  value={tempGasMark}
                  onValueChange={(value) =>
                    onTemperatureInput("gasMark", value)
                  }
                  suffix={shortUnitLabel("gasMark")}
                />
              </section>

              <div className="m-4 rounded-lg border px-4 py-3">
                <p className="mb-2 font-semibold">
                  {t("pages.measurementConverter.ovenTable.title")}
                </p>
                <div className="flex flex-col">
                  <div className="grid grid-cols-3 gap-2 border-b py-[5px] text-center text-[0.85rem] font-bold">
                    <span>
                      {t("pages.measurementConverter.temperature.fahrenheit")}
                    </span>
                    <span>
                      {t("pages.measurementConverter.temperature.celsius")}
                    </span>
                    <span>
                      {t("pages.measurementConverter.temperature.gasMark")}
                    </span>
                  </div>
                  {OVEN_TEMPERATURES.map((temp) => (
                    <div
                      key={temp.gasMark}
                      className="grid grid-cols-3 gap-2 border-b py-[5px] text-center"
                    >
                      <span>{temp.fahrenheit}</span>
                      <span>{temp.celsius}</span>
                      <span>{temp.gasMark}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2.5 text-[0.72rem] text-muted-foreground">
                  {t("pages.measurementConverter.ovenTable.footnote")}
                </p>
              </div>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
};
