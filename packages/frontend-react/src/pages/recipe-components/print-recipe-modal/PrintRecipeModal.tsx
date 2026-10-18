import { useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { PrinterIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { RecipePreview } from "../../../components/recipe-preview/RecipePreview";
import type { UnitSystem } from "../../../modals/scale-recipe/ScaleRecipe";
import { getCurrentLocale } from "../../../utils/formatDate";
import {
  printUrls,
  type RecipeTemplateModifiers,
} from "../../../utils/printUrls";
import { session } from "../../../utils/session";

export interface PrintOption {
  modifiers: RecipeTemplateModifiers;
  description: string;
  orientation: string;
  url: string;
}

const withToken = (url: string) => {
  const token = session.getToken();
  return token ? `${url}&token=${token}` : url;
};

export const PrintRecipeModal = ({
  controls,
  recipeId,
  scale,
  unitSystem = "original",
}: {
  controls: DialogControls<void>;
  recipeId: string;
  scale: string;
  unitSystem?: UnitSystem;
}) => {
  const { t } = useTranslation();
  const [selectedTemplate, setSelectedTemplate] = useState(-1);

  const [templates] = useState<PrintOption[]>(() => {
    const baseTemplates: Omit<PrintOption, "url">[] = [
      {
        modifiers: {
          titleImage: true,
          printPreview: true,
        },
        description: t("pages.printRecipeModal.template.standard"),
        orientation: "portrait",
      },
      {
        modifiers: {
          printPreview: true,
        },
        description: t("pages.printRecipeModal.template.standardNoImg"),
        orientation: "portrait",
      },
      {
        modifiers: {
          halfsheet: true,
          printPreview: true,
        },
        description: t("pages.printRecipeModal.template.halfSheetCols"),
        orientation: "landscape",
      },
      {
        modifiers: {
          halfsheet: true,
          verticalInstrIng: true,
          printPreview: true,
        },
        description: t(
          "pages.printRecipeModal.template.halfSheetCompactNoCols",
        ),
        orientation: "landscape",
      },
    ];

    return baseTemplates.map((template) => {
      const modifiers: RecipeTemplateModifiers = {
        ...template.modifiers,
        scale,
        unitSystem,
        showLastMade: true,
        hideLinkedRecipes: true,
        preferredLanguage: getCurrentLocale(),
        today: dayjs().format("YYYY-MM-DD"),
      };

      return {
        ...template,
        modifiers,
        url: withToken(printUrls.recipeTemplate(recipeId, modifiers)),
      };
    });
  });

  const print = () => {
    const template = templates.at(selectedTemplate);
    if (selectedTemplate < 0 || !template) return;

    const printUrl = withToken(
      printUrls.recipeTemplate(recipeId, {
        ...template.modifiers,
        print: true,
      }),
    );
    window.open(printUrl, "_blank", 'rel="noopener"');
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={null}
        title={t("pages.printRecipeModal.title")}
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
      <PageContent>
        <div className="flex flex-wrap justify-center">
          {templates.map((template, idx) => (
            <button
              key={idx}
              type="button"
              aria-pressed={selectedTemplate === idx}
              aria-label={template.description}
              className="rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              onClick={() => setSelectedTemplate(idx)}
            >
              <RecipePreview
                selected={selectedTemplate === idx}
                landscape={template.orientation === "landscape"}
                url={template.url}
                description={template.description}
              />
            </button>
          ))}
        </div>
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={selectedTemplate === -1}
          onClick={print}
        >
          <PrinterIcon data-icon="inline-start" />
          {t("pages.printRecipeModal.print")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
