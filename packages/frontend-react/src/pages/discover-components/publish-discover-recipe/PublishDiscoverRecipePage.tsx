import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CircleXIcon } from "lucide-react";
import type { ImageSummary } from "@recipesage/prisma";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CachedImage } from "../../../components/CachedImage";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MultiImageUpload } from "../../../components/multi-image-upload/MultiImageUpload";
import { RecipeFormatToolbar } from "../../../components/recipe-format-toolbar/RecipeFormatToolbar";
import {
  SelectDiscoverRecipe,
  type DiscoverRecipeSummary,
} from "../../../components/select-discover-recipe/SelectDiscoverRecipe";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import type { RouterInputs } from "../../../services/server-actions/ActionsBase";
import { thirdPartyAiConsentService } from "../../../services/thirdPartyAiConsentService";
import { unsavedChanges } from "../../../services/unsavedChanges";
import {
  getDiscoverLanguageOptions,
  localeToDiscoverLanguage,
} from "../../../utils/discoverLanguages";
import { getCurrentLocale } from "../../../utils/formatDate";

type DiscoverContent =
  RouterInputs["discover"]["publishDiscoverRecipe"]["content"];

type NutritionNumberField =
  | "nutritionCalories"
  | "nutritionTotalFat"
  | "nutritionSaturatedFat"
  | "nutritionTransFat"
  | "nutritionPolyunsaturatedFat"
  | "nutritionMonounsaturatedFat"
  | "nutritionCholesterol"
  | "nutritionSodium"
  | "nutritionTotalCarbs"
  | "nutritionDietaryFiber"
  | "nutritionTotalSugars"
  | "nutritionAddedSugars"
  | "nutritionProtein"
  | "nutritionVitaminD"
  | "nutritionCalcium"
  | "nutritionIron"
  | "nutritionPotassium";

type PublishRecipeFormField =
  | "title"
  | "description"
  | "yield"
  | "activeTime"
  | "totalTime"
  | "ingredients"
  | "instructions"
  | "notes"
  | "nutritionServingSize"
  | "nutritionOtherDetails"
  | NutritionNumberField;

type PublishRecipeForm = Record<PublishRecipeFormField, string>;

type ContentSource = Record<
  | "title"
  | "description"
  | "yield"
  | "activeTime"
  | "totalTime"
  | "ingredients"
  | "instructions"
  | "notes",
  string
> &
  Record<"nutritionServingSize" | "nutritionOtherDetails", string | null> &
  Record<NutritionNumberField, number | null>;

interface LinkedDiscoverRecipe {
  id: string;
  title: string;
  images: { location: string }[];
}

const NUTRITION_ACCORDION_VALUE = "nutrition";

const NUTRITION_NUMBER_FIELDS: {
  field: NutritionNumberField;
  labelKey: TranslationKey;
}[] = [
  {
    field: "nutritionCalories",
    labelKey: "pages.editRecipe.input.nutritionCalories",
  },
  {
    field: "nutritionTotalFat",
    labelKey: "pages.editRecipe.input.nutritionTotalFat",
  },
  {
    field: "nutritionSaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionSaturatedFat",
  },
  {
    field: "nutritionTransFat",
    labelKey: "pages.editRecipe.input.nutritionTransFat",
  },
  {
    field: "nutritionPolyunsaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionPolyunsaturatedFat",
  },
  {
    field: "nutritionMonounsaturatedFat",
    labelKey: "pages.editRecipe.input.nutritionMonounsaturatedFat",
  },
  {
    field: "nutritionCholesterol",
    labelKey: "pages.editRecipe.input.nutritionCholesterol",
  },
  {
    field: "nutritionSodium",
    labelKey: "pages.editRecipe.input.nutritionSodium",
  },
  {
    field: "nutritionTotalCarbs",
    labelKey: "pages.editRecipe.input.nutritionTotalCarbs",
  },
  {
    field: "nutritionDietaryFiber",
    labelKey: "pages.editRecipe.input.nutritionDietaryFiber",
  },
  {
    field: "nutritionTotalSugars",
    labelKey: "pages.editRecipe.input.nutritionTotalSugars",
  },
  {
    field: "nutritionAddedSugars",
    labelKey: "pages.editRecipe.input.nutritionAddedSugars",
  },
  {
    field: "nutritionProtein",
    labelKey: "pages.editRecipe.input.nutritionProtein",
  },
  {
    field: "nutritionVitaminD",
    labelKey: "pages.editRecipe.input.nutritionVitaminD",
  },
  {
    field: "nutritionCalcium",
    labelKey: "pages.editRecipe.input.nutritionCalcium",
  },
  {
    field: "nutritionIron",
    labelKey: "pages.editRecipe.input.nutritionIron",
  },
  {
    field: "nutritionPotassium",
    labelKey: "pages.editRecipe.input.nutritionPotassium",
  },
];

const emptyNutrition = (): Pick<
  PublishRecipeForm,
  "nutritionServingSize" | "nutritionOtherDetails" | NutritionNumberField
> => ({
  nutritionServingSize: "",
  nutritionCalories: "",
  nutritionTotalFat: "",
  nutritionSaturatedFat: "",
  nutritionTransFat: "",
  nutritionPolyunsaturatedFat: "",
  nutritionMonounsaturatedFat: "",
  nutritionCholesterol: "",
  nutritionSodium: "",
  nutritionTotalCarbs: "",
  nutritionDietaryFiber: "",
  nutritionTotalSugars: "",
  nutritionAddedSugars: "",
  nutritionProtein: "",
  nutritionVitaminD: "",
  nutritionCalcium: "",
  nutritionIron: "",
  nutritionPotassium: "",
  nutritionOtherDetails: "",
});

const emptyForm = (): PublishRecipeForm => ({
  title: "",
  description: "",
  yield: "",
  activeTime: "",
  totalTime: "",
  ingredients: "",
  instructions: "",
  notes: "",
  ...emptyNutrition(),
});

const toFormValue = (value: string | number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

const toNutritionNumber = (value: string): number | null => {
  if (value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
};

const formFromSource = (source: ContentSource): PublishRecipeForm => ({
  title: source.title,
  description: source.description,
  yield: source.yield,
  activeTime: source.activeTime,
  totalTime: source.totalTime,
  ingredients: source.ingredients,
  instructions: source.instructions,
  notes: source.notes,
  nutritionServingSize: toFormValue(source.nutritionServingSize),
  nutritionOtherDetails: toFormValue(source.nutritionOtherDetails),
  nutritionCalories: toFormValue(source.nutritionCalories),
  nutritionTotalFat: toFormValue(source.nutritionTotalFat),
  nutritionSaturatedFat: toFormValue(source.nutritionSaturatedFat),
  nutritionTransFat: toFormValue(source.nutritionTransFat),
  nutritionPolyunsaturatedFat: toFormValue(source.nutritionPolyunsaturatedFat),
  nutritionMonounsaturatedFat: toFormValue(source.nutritionMonounsaturatedFat),
  nutritionCholesterol: toFormValue(source.nutritionCholesterol),
  nutritionSodium: toFormValue(source.nutritionSodium),
  nutritionTotalCarbs: toFormValue(source.nutritionTotalCarbs),
  nutritionDietaryFiber: toFormValue(source.nutritionDietaryFiber),
  nutritionTotalSugars: toFormValue(source.nutritionTotalSugars),
  nutritionAddedSugars: toFormValue(source.nutritionAddedSugars),
  nutritionProtein: toFormValue(source.nutritionProtein),
  nutritionVitaminD: toFormValue(source.nutritionVitaminD),
  nutritionCalcium: toFormValue(source.nutritionCalcium),
  nutritionIron: toFormValue(source.nutritionIron),
  nutritionPotassium: toFormValue(source.nutritionPotassium),
});

const nutritionValues = (form: PublishRecipeForm) => [
  ...NUTRITION_NUMBER_FIELDS.map(({ field }) => form[field]),
  form.nutritionServingSize,
  form.nutritionOtherDetails,
];

const nutritionFieldCount = (form: PublishRecipeForm) =>
  nutritionValues(form).filter((value) => value !== "").length;

const hasNutrition = (form: PublishRecipeForm) => nutritionFieldCount(form) > 0;

const buildContent = (form: PublishRecipeForm): DiscoverContent => ({
  title: form.title,
  description: form.description,
  yield: form.yield,
  activeTime: form.activeTime,
  totalTime: form.totalTime,
  notes: form.notes,
  ingredients: form.ingredients,
  instructions: form.instructions,
  nutritionServingSize: form.nutritionServingSize || null,
  nutritionCalories: toNutritionNumber(form.nutritionCalories),
  nutritionTotalFat: toNutritionNumber(form.nutritionTotalFat),
  nutritionSaturatedFat: toNutritionNumber(form.nutritionSaturatedFat),
  nutritionTransFat: toNutritionNumber(form.nutritionTransFat),
  nutritionPolyunsaturatedFat: toNutritionNumber(
    form.nutritionPolyunsaturatedFat,
  ),
  nutritionMonounsaturatedFat: toNutritionNumber(
    form.nutritionMonounsaturatedFat,
  ),
  nutritionCholesterol: toNutritionNumber(form.nutritionCholesterol),
  nutritionSodium: toNutritionNumber(form.nutritionSodium),
  nutritionTotalCarbs: toNutritionNumber(form.nutritionTotalCarbs),
  nutritionDietaryFiber: toNutritionNumber(form.nutritionDietaryFiber),
  nutritionTotalSugars: toNutritionNumber(form.nutritionTotalSugars),
  nutritionAddedSugars: toNutritionNumber(form.nutritionAddedSugars),
  nutritionProtein: toNutritionNumber(form.nutritionProtein),
  nutritionVitaminD: toNutritionNumber(form.nutritionVitaminD),
  nutritionCalcium: toNutritionNumber(form.nutritionCalcium),
  nutritionIron: toNutritionNumber(form.nutritionIron),
  nutritionPotassium: toNutritionNumber(form.nutritionPotassium),
  nutritionOtherDetails: form.nutritionOtherDetails || null,
});

const markAsDirty = () => unsavedChanges.setPendingChanges();
const markAsClean = () => unsavedChanges.clearPendingChanges();

const PublishDiscoverRecipeForm = ({
  recipeId,
  discoverRecipeId,
}: {
  recipeId?: string;
  discoverRecipeId?: string;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const languageTriggerId = useId();

  const isEditMode = !!discoverRecipeId;

  const [languageOptions] = useState(() =>
    getDiscoverLanguageOptions(getCurrentLocale()),
  );
  const [form, setForm] = useState<PublishRecipeForm>(emptyForm);
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [language, setLanguage] = useState(() =>
    localeToDiscoverLanguage(getCurrentLocale()),
  );
  const [selectedLinkedRecipes, setSelectedLinkedRecipes] = useState<
    LinkedDiscoverRecipe[]
  >([]);
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nutritionAccordionValue, setNutritionAccordionValue] = useState<
    string[]
  >([]);

  const ingredientsInputRef = useRef<HTMLTextAreaElement>(null);
  const instructionsInputRef = useRef<HTMLTextAreaElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;

    const applySource = (source: ContentSource) => {
      const nextForm = formFromSource(source);
      setForm(nextForm);
      setNutritionAccordionValue(
        hasNutrition(nextForm) ? [NUTRITION_ACCORDION_VALUE] : [],
      );
    };

    const loadSourceRecipe = async (id: string) => {
      const loading = loadingService.start();
      const response = await serverActions.recipes.getRecipe({ id });
      loading.dismiss();
      if (cancelled || !response) return;

      if (response.source || response.url) {
        void showAlert({
          header: t("pages.publishDiscoverRecipe.ineligible.header"),
          message: t("pages.publishDiscoverRecipe.ineligible.message"),
          buttons: [
            {
              text: t("generic.okay"),
              handler: () => {
                void navigate({
                  to: "/recipe/$recipeId",
                  params: { recipeId: id },
                });
              },
            },
          ],
        });
        return;
      }

      applySource(response);
      setImages(
        [...response.recipeImages]
          .sort((a, b) => a.order - b.order)
          .map((recipeImage) => recipeImage.image),
      );
    };

    const loadDiscoverRecipe = async (id: string) => {
      const loading = loadingService.start();
      const response = await serverActions.discover.getDiscoverRecipe({ id });
      loading.dismiss();
      if (cancelled || !response) return;

      applySource(response);
      setImages(
        response.discoverRecipeImages.map((discoverRecipeImage) => ({
          id: discoverRecipeImage.image.id,
          location: discoverRecipeImage.image.location,
        })),
      );
      setLanguage(response.language);
      setSelectedLinkedRecipes(
        response.linkedRecipes.map((linkedRecipe) => ({
          id: linkedRecipe.id,
          title: linkedRecipe.title,
          images: linkedRecipe.discoverRecipeImages.map(
            (discoverRecipeImage) => ({
              location: discoverRecipeImage.image.location,
            }),
          ),
        })),
      );
    };

    if (discoverRecipeId) {
      void loadDiscoverRecipe(discoverRecipeId);
    } else if (recipeId) {
      void loadSourceRecipe(recipeId);
    }

    return () => {
      cancelled = true;
    };
  }, [recipeId, discoverRecipeId, navigate, t]);

  const setField = (field: PublishRecipeFormField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    markAsDirty();
  };

  const linkExcludeIds = [
    ...selectedLinkedRecipes.map((recipe) => recipe.id),
    ...(discoverRecipeId ? [discoverRecipeId] : []),
  ];

  const addLinkedRecipe = (recipe: DiscoverRecipeSummary) => {
    if (selectedLinkedRecipes.some((existing) => existing.id === recipe.id)) {
      return;
    }
    if (discoverRecipeId === recipe.id) return;

    setSelectedLinkedRecipes((prev) => [
      ...prev,
      {
        id: recipe.id,
        title: recipe.title,
        images: recipe.discoverRecipeImages.map((discoverRecipeImage) => ({
          location: discoverRecipeImage.image.location,
        })),
      },
    ]);
    markAsDirty();
  };

  const removeLinkedRecipe = (id: string) => {
    setSelectedLinkedRecipes((prev) =>
      prev.filter((recipe) => recipe.id !== id),
    );
    markAsDirty();
  };

  const clearNutrition = () => {
    setForm((prev) => ({ ...prev, ...emptyNutrition() }));
    markAsDirty();
  };

  const confirmClearNutrition = async () => {
    await showAlert({
      header: t("pages.editRecipe.input.nutritionClearConfirm.header"),
      message: t("pages.editRecipe.input.nutritionClearConfirm.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("pages.editRecipe.input.nutritionClear"),
          variant: "destructive",
          handler: () => {
            clearNutrition();
          },
        },
      ],
    });
  };

  const parseAndApplyNutrition = async (text: string) => {
    const loading = loadingService.start();
    const response = await serverActions.ml
      .getNutritionFromText({
        text,
      })
      .finally(() => loading.dismiss());
    if (!response) return;

    setForm((prev) => ({
      ...prev,
      nutritionServingSize: toFormValue(response.servingSize),
      nutritionCalories: toFormValue(response.calories),
      nutritionTotalFat: toFormValue(response.totalFat),
      nutritionSaturatedFat: toFormValue(response.saturatedFat),
      nutritionTransFat: toFormValue(response.transFat),
      nutritionPolyunsaturatedFat: toFormValue(response.polyunsaturatedFat),
      nutritionMonounsaturatedFat: toFormValue(response.monounsaturatedFat),
      nutritionCholesterol: toFormValue(response.cholesterol),
      nutritionSodium: toFormValue(response.sodium),
      nutritionTotalCarbs: toFormValue(response.totalCarbs),
      nutritionDietaryFiber: toFormValue(response.dietaryFiber),
      nutritionTotalSugars: toFormValue(response.totalSugars),
      nutritionAddedSugars: toFormValue(response.addedSugars),
      nutritionProtein: toFormValue(response.protein),
      nutritionVitaminD: toFormValue(response.vitaminD),
      nutritionCalcium: toFormValue(response.calcium),
      nutritionIron: toFormValue(response.iron),
      nutritionPotassium: toFormValue(response.potassium),
    }));
    setNutritionAccordionValue([NUTRITION_ACCORDION_VALUE]);
    markAsDirty();
  };

  const autofillNutritionFromText = async () => {
    if (!(await thirdPartyAiConsentService.ensureConsent())) return;

    await showAlert({
      header: t("pages.editRecipe.nutritionAutofill.header"),
      message: t("pages.editRecipe.nutritionAutofill.message"),
      inputs: [
        {
          name: "text",
          type: "textarea",
          placeholder: t("pages.editRecipe.nutritionAutofill.placeholder"),
        },
      ],
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.okay"),
          handler: (values) => {
            const text = values.text;
            if (!text || text.length < 10) {
              void showAlert({
                header: t("generic.error"),
                message: t("pages.editRecipe.nutritionAutofill.invalid"),
                buttons: [{ text: t("generic.okay") }],
              });
              return;
            }
            void parseAndApplyNutrition(text);
          },
        },
      ],
    });
  };

  const canSubmit =
    !saving && !!form.title.trim() && (isEditMode || agreedToTos);

  const submitPublish = async (id: string) => {
    const loading = loadingService.start();
    setSaving(true);

    const response = await serverActions.discover
      .publishDiscoverRecipe(
        {
          recipeId: id,
          content: buildContent(form),
          language,
          imageIds: images.map((image) => image.id),
          linkedDiscoverRecipeIds: selectedLinkedRecipes.map(
            (recipe) => recipe.id,
          ),
          agreedToTos: true,
        },
        {
          429: () => {
            void showAlert({
              header: t("pages.publishDiscoverRecipe.publishLimit.header"),
              message: t("pages.publishDiscoverRecipe.publishLimit.message"),
              buttons: [
                {
                  text: t("generic.okay"),
                  role: "cancel",
                },
              ],
            });
          },
        },
      )
      .finally(() => {
        loading.dismiss();
        setSaving(false);
      });

    if (!response) return;

    markAsClean();
    showToast({
      message: t("pages.publishDiscoverRecipe.publishSuccess"),
      duration: 5000,
    });
    void navigate({
      to: "/discover/$discoverRecipeId",
      params: { discoverRecipeId: response.id },
      replace: true,
    });
  };

  const submitEdit = async (id: string) => {
    const loading = loadingService.start();
    setSaving(true);

    const response = await serverActions.discover
      .updateDiscoverRecipe({
        id,
        content: buildContent(form),
        language,
        imageIds: images.map((image) => image.id),
        linkedDiscoverRecipeIds: selectedLinkedRecipes.map(
          (recipe) => recipe.id,
        ),
      })
      .finally(() => {
        loading.dismiss();
        setSaving(false);
      });

    if (!response) return;

    markAsClean();
    showToast({
      message: t("pages.publishDiscoverRecipe.editSuccess"),
      duration: 5000,
    });
    void navigate({
      to: "/discover/$discoverRecipeId",
      params: { discoverRecipeId: response.id },
    });
  };

  const submit = async () => {
    if (!canSubmit) return;

    if (discoverRecipeId) {
      await submitEdit(discoverRecipeId);
    } else if (recipeId) {
      await submitPublish(recipeId);
    }
  };

  return (
    <>
      <PageHeader
        start={
          <BackButton
            fallback={
              discoverRecipeId
                ? {
                    to: "/discover/$discoverRecipeId",
                    params: { discoverRecipeId },
                  }
                : recipeId
                  ? { to: "/recipe/$recipeId", params: { recipeId } }
                  : { to: "/discover" }
            }
          />
        }
        title={
          isEditMode
            ? t("pages.publishDiscoverRecipe.title.edit")
            : t("pages.publishDiscoverRecipe.title.publish")
        }
      />
      <PageContent padded={false}>
        <MultiImageUpload
          images={images}
          onImageUpdate={(updatedImages) => {
            setImages(updatedImages);
            markAsDirty();
          }}
        />

        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4 pb-[25vh]">
          <TextField
            label={t("pages.editRecipe.input.title")}
            value={form.title}
            onValueChange={(value) => setField("title", value)}
            type="text"
            maxLength={254}
            autoCapitalize="on"
            autoCorrect="on"
          />

          <TextArea
            label={t("pages.editRecipe.input.description")}
            value={form.description}
            onValueChange={(value) => setField("description", value)}
            autoGrow
            autoCapitalize="on"
            autoCorrect="on"
          />

          <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))] sm:gap-x-5">
            <TextField
              label={t("pages.editRecipe.input.yield")}
              value={form.yield}
              onValueChange={(value) => setField("yield", value)}
              type="text"
              autoCapitalize="on"
              autoCorrect="on"
            />
            <TextField
              label={t("pages.editRecipe.input.activeTime")}
              value={form.activeTime}
              onValueChange={(value) => setField("activeTime", value)}
              type="text"
              autoCapitalize="on"
              autoCorrect="on"
            />
            <TextField
              label={t("pages.editRecipe.input.totalTime")}
              value={form.totalTime}
              onValueChange={(value) => setField("totalTime", value)}
              type="text"
              autoCapitalize="on"
              autoCorrect="on"
            />
          </div>

          <TextArea
            ref={ingredientsInputRef}
            label={t("pages.editRecipe.input.ingredients")}
            value={form.ingredients}
            onValueChange={(value) => setField("ingredients", value)}
            autoGrow
            autoCapitalize="on"
            autoCorrect="on"
          >
            <RecipeFormatToolbar
              field="ingredients"
              target={ingredientsInputRef}
            />
          </TextArea>

          <TextArea
            ref={instructionsInputRef}
            label={t("pages.editRecipe.input.instructions")}
            value={form.instructions}
            onValueChange={(value) => setField("instructions", value)}
            autoGrow
            autoCapitalize="on"
            autoCorrect="on"
          >
            <RecipeFormatToolbar
              field="instructions"
              target={instructionsInputRef}
              imageCount={images.length}
            />
          </TextArea>

          <TextArea
            ref={notesInputRef}
            label={t("pages.editRecipe.input.notes")}
            value={form.notes}
            onValueChange={(value) => setField("notes", value)}
            autoGrow
            autoCapitalize="on"
            autoCorrect="on"
          >
            <RecipeFormatToolbar
              field="notes"
              target={notesInputRef}
              imageCount={images.length}
            />
          </TextArea>

          <Accordion
            value={nutritionAccordionValue}
            onValueChange={(value) =>
              setNutritionAccordionValue(
                value.filter((entry) => entry === NUTRITION_ACCORDION_VALUE),
              )
            }
          >
            <AccordionItem value={NUTRITION_ACCORDION_VALUE}>
              <AccordionTrigger className="items-center text-base">
                <span className="flex-1">
                  {t("pages.editRecipe.input.nutrition")}
                </span>
                {hasNutrition(form) && (
                  <Badge className="me-2">{nutritionFieldCount(form)}</Badge>
                )}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex justify-end gap-1 pb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary"
                    onClick={() => void autofillNutritionFromText()}
                  >
                    {t("pages.editRecipe.input.nutritionAutofill")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => void confirmClearNutrition()}
                  >
                    {t("pages.editRecipe.input.nutritionClear")}
                  </Button>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-5 gap-y-4">
                  <TextField
                    label={t("pages.editRecipe.input.nutritionServingSize")}
                    value={form.nutritionServingSize}
                    onValueChange={(value) =>
                      setField("nutritionServingSize", value)
                    }
                    type="text"
                  />
                  {NUTRITION_NUMBER_FIELDS.map(({ field, labelKey }) => (
                    <TextField
                      key={field}
                      label={t(labelKey)}
                      value={form[field]}
                      onValueChange={(value) => setField(field, value)}
                      type="text"
                      inputMode="decimal"
                    />
                  ))}
                  <div className="col-span-full">
                    <TextArea
                      label={t("pages.editRecipe.input.nutritionOtherDetails")}
                      value={form.nutritionOtherDetails}
                      onValueChange={(value) =>
                        setField("nutritionOtherDetails", value)
                      }
                      autoGrow
                      rows={2}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Field>
            <FieldLabel htmlFor={languageTriggerId}>
              {t("pages.publishDiscoverRecipe.input.language")}
            </FieldLabel>
            <Select
              value={language}
              items={languageOptions.map((option) => ({
                value: option.code,
                label: option.label,
              }))}
              onValueChange={(value) => {
                const option = languageOptions.find(
                  (languageOption) => languageOption.code === value,
                );
                if (!option) return;
                setLanguage(option.code);
                markAsDirty();
              }}
            >
              <SelectTrigger
                id={languageTriggerId}
                className="h-10 w-full sm:max-w-80"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    <span dir="auto">{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div>
            <h2 className="text-base font-medium">
              {t("pages.publishDiscoverRecipe.input.linkedRecipes")}
            </h2>

            {selectedLinkedRecipes.length > 0 && (
              <ul className="mt-2">
                {selectedLinkedRecipes.map((linkedRecipe) => {
                  const linkedImage = linkedRecipe.images[0];
                  return (
                    <li
                      key={linkedRecipe.id}
                      className="flex min-h-12 items-center gap-4 px-2 py-1"
                    >
                      {linkedImage ? (
                        <CachedImage
                          src={linkedImage.location}
                          className="size-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <img
                          src="assets/imgs/logo_green_padded.png"
                          alt=""
                          className="size-10 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span dir="auto" className="min-w-0 flex-1 truncate">
                        {linkedRecipe.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-primary"
                        aria-label={t("generic.delete")}
                        onClick={() => removeLinkedRecipe(linkedRecipe.id)}
                      >
                        <CircleXIcon className="size-6" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <SelectDiscoverRecipe
              excludeIds={linkExcludeIds}
              onRecipeSelected={addLinkedRecipe}
            />
          </div>

          {!isEditMode && (
            <div className="mt-6 flex flex-col gap-3">
              <Label className="items-start text-base leading-snug font-normal">
                <Checkbox
                  className="mt-0.5"
                  checked={agreedToTos}
                  onCheckedChange={(checked) => {
                    setAgreedToTos(checked);
                    markAsDirty();
                  }}
                />
                <span className="whitespace-normal">
                  {t("pages.publishDiscoverRecipe.tos.agreeLabel")}
                </span>
              </Label>
              <Link
                to="/legal"
                search={{ scrollTo: "sharing" }}
                target="_blank"
                rel="noopener"
                className="text-[0.9em] text-primary underline-offset-4 hover:underline"
              >
                {t("pages.publishDiscoverRecipe.tos.viewLink")}
              </Link>
            </div>
          )}

          <div className="p-4">
            <Button
              size="lg"
              className="w-full"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              {isEditMode
                ? t("pages.publishDiscoverRecipe.button.save")
                : t("pages.publishDiscoverRecipe.button.publish")}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
};

export const PublishDiscoverRecipePage = () => {
  const { recipeId, discoverRecipeId } = useParams({ strict: false });

  return (
    <PublishDiscoverRecipeForm
      key={`${recipeId}:${discoverRecipeId}`}
      recipeId={recipeId}
      discoverRecipeId={discoverRecipeId}
    />
  );
};
