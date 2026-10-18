import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontalIcon } from "lucide-react";
import {
  MeasurementConverterPreferenceKey,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  isVolumeUnit,
  isWeightUnit,
  type VolumeUnit,
  type WeightUnit,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { preferencesStore } from "../../../stores/preferencesStore";
import { measurementConverterI18nKeys } from "../measurement-converter/measurementConverterI18nKeys";

export const MeasurementConverterPopover = () => {
  const { t } = useTranslation();
  const volumeTriggerId = useId();
  const weightTriggerId = useId();
  const enabledUnits = preferencesStore(
    (state) =>
      state.preferences[MeasurementConverterPreferenceKey.EnabledUnits],
  );

  const selectedVolumeUnits = VOLUME_UNITS.filter((unit) =>
    enabledUnits.includes(unit),
  );
  const selectedWeightUnits = WEIGHT_UNITS.filter((unit) =>
    enabledUnits.includes(unit),
  );

  const saveUnits = (volumeUnits: VolumeUnit[], weightUnits: WeightUnit[]) => {
    preferencesStore
      .getState()
      .setPreference(MeasurementConverterPreferenceKey.EnabledUnits, [
        ...VOLUME_UNITS.filter((unit) => volumeUnits.includes(unit)),
        ...WEIGHT_UNITS.filter((unit) => weightUnits.includes(unit)),
      ]);
  };

  const unitListLabel = (units: (VolumeUnit | WeightUnit)[]) =>
    units.map((unit) => t(measurementConverterI18nKeys.units[unit])).join(", ");

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("pages.measurementConverter.displayOptions")}
          />
        }
      >
        <SlidersHorizontalIcon className="size-6" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverTitle className="text-base font-medium">
          {t("pages.measurementConverter.displayOptions")}
        </PopoverTitle>

        <Field>
          <FieldLabel htmlFor={volumeTriggerId}>
            {t("pages.measurementConverter.volume")}
          </FieldLabel>
          <Select
            multiple
            value={selectedVolumeUnits}
            onValueChange={(value) => {
              saveUnits(value.filter(isVolumeUnit), selectedWeightUnits);
            }}
          >
            <SelectTrigger id={volumeTriggerId} className="h-10 w-full">
              <SelectValue className="truncate">
                {unitListLabel(selectedVolumeUnits)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VOLUME_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {t(measurementConverterI18nKeys.units[unit])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={weightTriggerId}>
            {t("pages.measurementConverter.weight")}
          </FieldLabel>
          <Select
            multiple
            value={selectedWeightUnits}
            onValueChange={(value) => {
              saveUnits(selectedVolumeUnits, value.filter(isWeightUnit));
            }}
          >
            <SelectTrigger id={weightTriggerId} className="h-10 w-full">
              <SelectValue className="truncate">
                {unitListLabel(selectedWeightUnits)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WEIGHT_UNITS.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {t(measurementConverterI18nKeys.units[unit])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </PopoverContent>
    </Popover>
  );
};
