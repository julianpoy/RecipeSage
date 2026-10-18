import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RecipeDetailsPreferenceKey } from "@recipesage/util/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { preferencesStore } from "../../../stores/preferencesStore";
import {
  NUTRITION_NUMBER_FIELDS,
  recipeFormUtils,
  type RecipeForm,
  type RecipeFormTextField,
} from "./recipeFormUtils";

const NUTRITION_ACCORDION_VALUE = "nutrition";

export const EditRecipeNutrition = ({
  form,
  onFieldChange,
  onAutofill,
  onClear,
}: {
  form: RecipeForm;
  onFieldChange: (field: RecipeFormTextField, value: string) => void;
  onAutofill: () => void;
  onClear: () => void;
}) => {
  const { t } = useTranslation();
  const [accordionValue, setAccordionValue] = useState<string[]>(() =>
    preferencesStore.getState().preferences[
      RecipeDetailsPreferenceKey.AutoExpandNutrition
    ]
      ? [NUTRITION_ACCORDION_VALUE]
      : [],
  );

  const hasNutrition = recipeFormUtils.hasNutrition(form);

  return (
    <Accordion
      value={accordionValue}
      onValueChange={(value) =>
        setAccordionValue(
          value.filter((entry) => entry === NUTRITION_ACCORDION_VALUE),
        )
      }
    >
      <AccordionItem value={NUTRITION_ACCORDION_VALUE}>
        <AccordionTrigger className="items-center text-base">
          <span className="flex-1">
            {t("pages.editRecipe.input.nutrition")}
          </span>
          {hasNutrition && (
            <Badge className="me-2">
              {recipeFormUtils.nutritionFieldCount(form)}
            </Badge>
          )}
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex justify-end gap-1 pb-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={onAutofill}
            >
              {t("pages.editRecipe.input.nutritionAutofill")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onClear}
            >
              {t("pages.editRecipe.input.nutritionClear")}
            </Button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-4">
            <TextField
              label={t("pages.editRecipe.input.nutritionServingSize")}
              value={form.nutritionServingSize}
              onValueChange={(value) =>
                onFieldChange("nutritionServingSize", value)
              }
              type="text"
            />
            {NUTRITION_NUMBER_FIELDS.map(({ field, labelKey }) => (
              <TextField
                key={field}
                label={t(labelKey)}
                value={form[field]}
                onValueChange={(value) => onFieldChange(field, value)}
                type="text"
                inputMode="decimal"
              />
            ))}
            <div className="col-span-full">
              <TextArea
                label={t("pages.editRecipe.input.nutritionOtherDetails")}
                value={form.nutritionOtherDetails}
                onValueChange={(value) =>
                  onFieldChange("nutritionOtherDetails", value)
                }
                autoGrow
                rows={2}
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
