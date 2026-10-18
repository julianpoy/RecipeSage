import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GlobalPreferenceKey,
  SupportedFontSize,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ModalDialog } from "../dialogs/ModalDialog";
import type { DialogControls } from "../dialogs/openDialog";
import { PageContent } from "../layout/PageContent";
import { PageFooter } from "../layout/PageFooter";
import { PageHeader } from "../layout/PageHeader";
import type { TranslationKey } from "../../i18n/TranslationKey";
import { preferencesStore } from "../../stores/preferencesStore";

const FONT_SIZE_OPTIONS: {
  fontSize: SupportedFontSize;
  translationName: TranslationKey;
}[] = [
  {
    fontSize: SupportedFontSize.X1_0,
    translationName: "components.fontSize.option.X1_0",
  },
  {
    fontSize: SupportedFontSize.PX14,
    translationName: "components.fontSize.option.PX14",
  },
  {
    fontSize: SupportedFontSize.PX16,
    translationName: "components.fontSize.option.PX16",
  },
  {
    fontSize: SupportedFontSize.PX18,
    translationName: "components.fontSize.option.PX18",
  },
  {
    fontSize: SupportedFontSize.PX20,
    translationName: "components.fontSize.option.PX20",
  },
  {
    fontSize: SupportedFontSize.PX22,
    translationName: "components.fontSize.option.PX22",
  },
  {
    fontSize: SupportedFontSize.PX24,
    translationName: "components.fontSize.option.PX24",
  },
];

const isSupportedFontSize = (value: unknown): value is SupportedFontSize =>
  FONT_SIZE_OPTIONS.some((option) => option.fontSize === value);

export const FontSizeModal = ({
  controls,
  fontSize: initialFontSize,
}: {
  controls: DialogControls<SupportedFontSize>;
  fontSize?: SupportedFontSize;
}) => {
  const { t } = useTranslation();
  const preferredFontSize = preferencesStore(
    (state) => state.preferences[GlobalPreferenceKey.FontSize],
  );
  const [fontSize, setFontSize] = useState<SupportedFontSize>(
    () => initialFontSize ?? preferredFontSize,
  );

  return (
    <ModalDialog
      controls={controls}
      className="sm:h-auto sm:max-h-[90vh] sm:max-w-lg"
    >
      <PageHeader start={<></>} title={t("components.fontSize.title")} />
      <PageContent>
        <RadioGroup
          value={fontSize}
          onValueChange={(value) => {
            if (isSupportedFontSize(value)) setFontSize(value);
          }}
          className="gap-0"
        >
          {FONT_SIZE_OPTIONS.map((fontSizeOption) => (
            <Label
              key={fontSizeOption.fontSize}
              className="min-h-12 py-2 font-normal"
            >
              <RadioGroupItem value={fontSizeOption.fontSize} />
              <span style={{ fontSize: fontSizeOption.fontSize }}>
                {t(fontSizeOption.translationName)}
              </span>
            </Label>
          ))}
        </RadioGroup>
      </PageContent>
      <PageFooter className="flex justify-end gap-1 px-2 py-2">
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => controls.close(SupportedFontSize.X1_0)}
        >
          {t("components.fontSize.reset")}
        </Button>
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => controls.close(fontSize)}
        >
          {t("generic.okay")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
