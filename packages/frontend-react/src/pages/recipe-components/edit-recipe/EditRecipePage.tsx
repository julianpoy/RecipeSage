import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
  type Photo,
} from "@capacitor/camera";
import {
  FilePicker,
  type PickFilesResult,
} from "@capawesome/capacitor-file-picker";
import { CameraIcon, FileTextIcon, LinkIcon, ScissorsIcon } from "lucide-react";
import type {
  ImageSummary,
  LabelGroupSummary,
  LabelSummary,
  RecipeSummary,
} from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldTitle } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { AlertModal } from "../../../components/alert-modal/AlertModal";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MultiImageUpload } from "../../../components/multi-image-upload/MultiImageUpload";
import { Rating } from "../../../components/rating/Rating";
import { RecipeFormatToolbar } from "../../../components/recipe-format-toolbar/RecipeFormatToolbar";
import type { SelectableItem } from "../../../components/select-multiple-items/SelectMultipleItems";
import { IS_SELFHOST } from "../../../environments/environment";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useEvent } from "../../../hooks/useEvent";
import { EventName } from "../../../services/events";
import type { ErrorHandlers } from "../../../services/httpErrorHandler";
import type { RouterInputs } from "../../../services/server-actions/ActionsBase";
import { imageService } from "../../../services/imageService";
import { loadingService } from "../../../services/loadingService";
import { mlService } from "../../../services/mlService";
import {
  pendingShareService,
  type PendingShare,
} from "../../../services/pendingShareService";
import { serverActions } from "../../../services/serverActions";
import { thirdPartyAiConsentService } from "../../../services/thirdPartyAiConsentService";
import { unsavedChanges } from "../../../services/unsavedChanges";
import { capabilitiesStore } from "../../../stores/capabilitiesStore";
import { getQueryParam } from "../../../utils/queryParams";
import { EditRecipePopover } from "../edit-recipe-popover/EditRecipePopover";
import { EditRecipeLabels } from "./EditRecipeLabels";
import {
  EditRecipeLinkedRecipes,
  type LinkedRecipe,
} from "./EditRecipeLinkedRecipes";
import { EditRecipeNutrition } from "./EditRecipeNutrition";
import {
  recipeFormUtils,
  type NutritionValues,
  type RecipeForm,
  type RecipeFormTextField,
} from "./recipeFormUtils";
import { showLoadingOverlay } from "./showLoadingOverlay";

const routeApi = getRouteApi("/edit-recipe/$recipeId");

const MAX_IMAGES_SCAN = 3;

const SUPPORTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "text/markdown",
  "text/html",
  "text/plain",
];

const SHARE_RECEIVED_EVENTS = [EventName.ShareReceived];

const findLastUrlInString = (s: unknown) => {
  if (typeof s !== "string") return;

  // Robust URL finding regex from https://www.regextester.com/93652
  // TODO: Replace this with a lib
  const matchedUrl = s.match(
    /(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()[\]{};:'".,<>?«»""'']))?/gi,
  );
  if (matchedUrl) return matchedUrl.pop();
};

const isValidHttpUrl = (input: string) => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    return false;
  }

  return url.protocol.startsWith("http");
};

const isUnsupportedSiteUrl = (input: string) => {
  let url: URL;

  const regex = /youtube\.com|tiktok\.com|facebook\.com|instagram\.com/;

  try {
    url = new URL(input);
  } catch {
    return false;
  }

  return !!url.host.match(regex);
};

const getDocumentExtension = (fileName: string): string => {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return fileName.substring(dotIndex).toLowerCase();
};

const nutritionResponseToValues = (response: {
  servingSize?: string | null;
  calories?: number | null;
  totalFat?: number | null;
  saturatedFat?: number | null;
  transFat?: number | null;
  polyunsaturatedFat?: number | null;
  monounsaturatedFat?: number | null;
  cholesterol?: number | null;
  sodium?: number | null;
  totalCarbs?: number | null;
  dietaryFiber?: number | null;
  totalSugars?: number | null;
  addedSugars?: number | null;
  protein?: number | null;
  vitaminD?: number | null;
  calcium?: number | null;
  iron?: number | null;
  potassium?: number | null;
}): NutritionValues => ({
  nutritionServingSize: response.servingSize,
  nutritionCalories: response.calories,
  nutritionTotalFat: response.totalFat,
  nutritionSaturatedFat: response.saturatedFat,
  nutritionTransFat: response.transFat,
  nutritionPolyunsaturatedFat: response.polyunsaturatedFat,
  nutritionMonounsaturatedFat: response.monounsaturatedFat,
  nutritionCholesterol: response.cholesterol,
  nutritionSodium: response.sodium,
  nutritionTotalCarbs: response.totalCarbs,
  nutritionDietaryFiber: response.dietaryFiber,
  nutritionTotalSugars: response.totalSugars,
  nutritionAddedSugars: response.addedSugars,
  nutritionProtein: response.protein,
  nutritionVitaminD: response.vitaminD,
  nutritionCalcium: response.calcium,
  nutritionIron: response.iron,
  nutritionPotassium: response.potassium,
});

const toLinkedRecipe = (recipe: LinkedRecipe): LinkedRecipe => ({
  id: recipe.id,
  title: recipe.title,
  recipeImages: recipe.recipeImages,
});

const EditRecipeEditor = ({ recipeId }: { recipeId?: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const multipleImagesCapable = capabilitiesStore(
    (state) => state.capabilities.multipleImages,
  );

  const [form, setForm] = useState<RecipeForm>(() => recipeFormUtils.empty());
  const [originalTitle, setOriginalTitle] = useState<string>();
  const [images, setImages] = useState<ImageSummary[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<LabelSummary[]>([]);
  const [extraLabels, setExtraLabels] = useState<LabelSummary[]>([]);
  const [selectedLinkedRecipes, setSelectedLinkedRecipes] = useState<
    LinkedRecipe[]
  >([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [initialized, setInitialized] = useState(!recipeId);

  const [isClipTextModalOpen, setIsClipTextModalOpen] = useState(false);
  const [clipTextInput, setClipTextInput] = useState("");
  const [clipTextIncludeNutrition, setClipTextIncludeNutrition] =
    useState(false);
  const [isClipUrlModalOpen, setIsClipUrlModalOpen] = useState(false);
  const [clipUrlInput, setClipUrlInput] = useState("");
  const [clipUrlIncludeNutrition, setClipUrlIncludeNutrition] = useState(false);
  const [isClipDocumentModalOpen, setIsClipDocumentModalOpen] = useState(false);
  const [clipDocumentIncludeNutrition, setClipDocumentIncludeNutrition] =
    useState(false);
  const [isAddImageByUrlModalOpen, setIsAddImageByUrlModalOpen] =
    useState(false);
  const [addImageByUrlInput, setAddImageByUrlInput] = useState("");

  const ingredientsInputRef = useRef<HTMLTextAreaElement>(null);
  const instructionsInputRef = useRef<HTMLTextAreaElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);
  const mountHandledRef = useRef(false);

  const recipeQuery = useActionQuery(
    ["recipes.getRecipe", { id: recipeId }],
    () => serverActions.recipes.getRecipe({ id: recipeId || "" }),
    { enabled: !!recipeId },
  );
  const labelsQuery = useActionQuery(["labels.getLabels"], () =>
    serverActions.labels.getLabels(),
  );
  const labelGroupsQuery = useActionQuery(["labelGroups.getLabelGroups"], () =>
    serverActions.labelGroups.getLabelGroups(),
  );

  const isFetching =
    (!!recipeId && recipeQuery.isFetching) ||
    labelsQuery.isFetching ||
    labelGroupsQuery.isFetching;
  useEffect(() => {
    if (!isFetching) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isFetching]);

  const labels = useMemo(() => {
    const loaded = [...(labelsQuery.data || [])].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    const loadedIds = new Set(loaded.map((label) => label.id));
    return [
      ...loaded,
      ...extraLabels.filter((label) => !loadedIds.has(label.id)),
    ];
  }, [labelsQuery.data, extraLabels]);

  const labelGroups = useMemo(
    () =>
      [...(labelGroupsQuery.data || [])].sort((a, b) =>
        a.title.localeCompare(b.title),
      ),
    [labelGroupsQuery.data],
  );

  if (!initialized && !isFetching) {
    setInitialized(true);
    const fullRecipe = recipeQuery.data;
    if (fullRecipe) {
      const labelsById = new Map(labels.map((label) => [label.id, label]));

      setForm(recipeFormUtils.fromRecipe(fullRecipe));
      setImages(
        [...fullRecipe.recipeImages]
          .sort((a, b) => a.order - b.order)
          .map((recipeImage) => recipeImage.image),
      );
      setOriginalTitle(fullRecipe.title);
      setSelectedLabels(
        fullRecipe.recipeLabels
          .map((recipeLabel) => labelsById.get(recipeLabel.label.id))
          .filter((label) => label !== undefined),
      );
      setSelectedLinkedRecipes(
        fullRecipe.recipeLinks.map((link) => toLinkedRecipe(link.linkedRecipe)),
      );
    }
  }

  const markAsDirty = () => {
    unsavedChanges.setPendingChanges();
  };

  const markAsClean = () => {
    unsavedChanges.clearPendingChanges();
  };

  const setField = (field: RecipeFormTextField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    markAsDirty();
  };

  const applyContentFields = (
    source: Parameters<typeof recipeFormUtils.contentFields>[0],
  ) => {
    setForm((prev) => ({
      ...prev,
      ...recipeFormUtils.contentFields(source),
    }));
    markAsDirty();
  };

  const applyNutritionValues = (values: NutritionValues) => {
    setForm((prev) => ({
      ...prev,
      ...recipeFormUtils.nutritionToForm(values),
    }));
    markAsDirty();
  };

  const presentAlert = (
    header: string,
    message: string,
    okText: string,
    role?: string,
  ) =>
    showAlert({
      header,
      message,
      buttons: [{ text: okText, role }],
    });

  const getFileTooLargeErrorHandlers = (): ErrorHandlers => ({
    413: () =>
      presentAlert(
        t("generic.error"),
        t("pages.editRecipe.clip.fileTooLarge"),
        t("generic.okay"),
        "cancel",
      ),
  });

  const getSelfhostErrorHandlers = (): ErrorHandlers =>
    IS_SELFHOST
      ? {
          500: () =>
            presentAlert(
              t("generic.error"),
              t("pages.editRecipe.clip.failedSelfhost"),
              t("generic.okay"),
              "cancel",
            ),
        }
      : {};

  const presentClipFailed = (okText = t("generic.okay")) =>
    presentAlert(t("generic.error"), t("pages.editRecipe.clip.failed"), okText);

  const parseAndApplyNutrition = async (text: string) => {
    const response = await serverActions.ml.getNutritionFromText({
      text,
    });
    if (!response) return;

    applyNutritionValues(nutritionResponseToValues(response));
  };

  const applyClipNutrition = (source: NutritionValues): boolean => {
    if (!recipeFormUtils.hasStructuredNutrition(source)) return false;

    applyNutritionValues(source);
    return true;
  };

  const clipFromUrlInternal = async (url: string, includeNutrition = false) => {
    const loading = showLoadingOverlay(t("pages.editRecipe.clip.loading"));

    const response = await serverActions.ml.clipFromUrl(
      {
        url,
      },
      {
        400: () => presentClipFailed(t("generic.ok")),
      },
    );
    if (!response) {
      loading.dismiss();
      return;
    }

    applyContentFields(response);
    setForm((prev) => ({ ...prev, url }));

    if (includeNutrition) {
      const appliedStructuredNutrition = applyClipNutrition(response);
      if (!appliedStructuredNutrition && response.nutritionInfo) {
        await parseAndApplyNutrition(response.nutritionInfo);
      }
    }

    if (
      !(response.ingredients || "").trim() &&
      !(response.instructions || "").trim()
    ) {
      void presentAlert(
        t("generic.error"),
        t("pages.editRecipe.clip.emptyResult"),
        t("generic.ok"),
      );
    }

    if (response.imageURL?.trim().length) {
      const IMAGE_LOADING_TIMEOUT = 3000;

      // Handle very long image fetch. Dismiss loading overlay if image import takes too long.
      await Promise.race([
        new Promise((resolve) => setTimeout(resolve, IMAGE_LOADING_TIMEOUT)),
        (async () => {
          const imageResponse =
            await serverActions.images.createRecipeImageFromUrl(
              {
                url: response.imageURL,
              },
              {
                "*": () => {},
              },
            );
          if (imageResponse) setImages((prev) => [...prev, imageResponse]);
        })(),
      ]);
    }

    loading.dismiss();
  };

  const autoClip = (source: string) => {
    const lastUrlInString = findLastUrlInString(source);
    if (lastUrlInString) void clipFromUrlInternal(lastUrlInString);
  };

  const checkAutoClip = () => {
    // Check if we're handling a Web Share API launch. If so, attempt to automatically import the given recipe
    const autofillUrl = getQueryParam("autofill-url");
    const sharetargetText = getQueryParam("sharetarget-text");
    const sharetargetTitle = getQueryParam("sharetarget-title");

    const autoClipSource = autofillUrl || sharetargetText || sharetargetTitle;

    if (autoClipSource) autoClip(autoClipSource);
  };

  const applyRecipeFromFile = async (
    getResponse: () => ReturnType<typeof mlService.getRecipeFromOCR>,
  ) => {
    const loading = showLoadingOverlay(t("pages.editRecipe.clip.loading"));

    try {
      const response = await getResponse();

      if (!response.success) return false;

      applyContentFields(response.data.recipe);
      return true;
    } finally {
      loading.dismiss();
    }
  };

  const getDocumentErrorHandlers = (): ErrorHandlers => ({
    ...getSelfhostErrorHandlers(),
    ...getFileTooLargeErrorHandlers(),
    400: () => presentClipFailed(),
  });

  const autofillFromSharedDocument = async (file: File) => {
    const extension = getDocumentExtension(file.name);
    const errorHandlers = getDocumentErrorHandlers();

    await applyRecipeFromFile(() =>
      extension === ".pdf"
        ? mlService.getRecipeFromPDF(file, errorHandlers)
        : mlService.getRecipeFromDocument(file, errorHandlers),
    );
  };

  const uploadFirstScanImage = async (files: File[]) => {
    const firstFile = files.at(0);
    if (!firstFile) return;

    const imageResponse = await imageService.create(firstFile, {
      "*": () => {},
    });

    if (imageResponse.success) {
      const image = imageResponse.data;
      setImages((prev) => [...prev, image]);
    }
  };

  const autofillFromSharedImages = async (files: File[]) => {
    if (!files.length) return;

    const success = await applyRecipeFromFile(() =>
      mlService.getRecipeFromOCR(files, getDocumentErrorHandlers()),
    );
    if (!success) return;

    await uploadFirstScanImage(files);
  };

  const hasRecipeContent = () =>
    !!(
      form.title.trim() ||
      form.description.trim() ||
      form.ingredients.trim() ||
      form.instructions.trim() ||
      form.notes.trim() ||
      images.length
    );

  const resetRecipe = () => {
    setForm(recipeFormUtils.empty());
    setImages([]);
    setSelectedLabels([]);
    setSelectedLinkedRecipes([]);
  };

  const confirmReplaceForShare = async (): Promise<boolean> => {
    const { role } = await showAlert({
      header: t("pages.editRecipe.shareReplace.header"),
      message: t("pages.editRecipe.shareReplace.message"),
      buttons: [
        { text: t("generic.cancel"), role: "cancel" },
        { text: t("pages.editRecipe.shareReplace.confirm"), role: "confirm" },
      ],
    });

    return role === "confirm";
  };

  const applyPendingShare = async (pending: PendingShare) => {
    if (pending.kind === "url") {
      autoClip(pending.url);
    } else if (pending.kind === "document") {
      await autofillFromSharedDocument(pending.file);
    } else if (pending.kind === "images") {
      await autofillFromSharedImages(pending.files);
    }
  };

  const handleIncomingShare = async () => {
    const pending = pendingShareService.consume();
    if (!pending) return;

    if (
      pending.kind !== "url" &&
      !(await thirdPartyAiConsentService.ensureConsent())
    ) {
      return;
    }

    if (hasRecipeContent() || unsavedChanges.hasPendingChanges()) {
      const confirmed = await confirmReplaceForShare();
      if (!confirmed) return;
    }

    resetRecipe();
    await applyPendingShare(pending);
  };

  const onMountNewRecipe = useEffectEvent(() => {
    checkAutoClip();
    void handleIncomingShare();
  });

  useEffect(() => {
    if (recipeId || mountHandledRef.current) return;
    mountHandledRef.current = true;
    onMountNewRecipe();
  }, [recipeId]);

  useEvent(SHARE_RECEIVED_EVENTS, () => {
    void handleIncomingShare();
  });

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
            applyNutritionValues({});
          },
        },
      ],
    });
  };

  const autofillNutrition = async (text: string) => {
    const loading = showLoadingOverlay(
      t("pages.editRecipe.nutritionAutofill.loading"),
    );

    const response = await serverActions.ml.getNutritionFromText(
      { text },
      {
        400: () =>
          presentAlert(
            t("generic.error"),
            t("pages.editRecipe.nutritionAutofill.failed"),
            t("generic.okay"),
          ),
      },
    );
    loading.dismiss();
    if (!response) return;

    applyNutritionValues(nutritionResponseToValues(response));
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
              void presentAlert(
                t("generic.error"),
                t("pages.editRecipe.nutritionAutofill.invalid"),
                t("generic.okay"),
              );
              return;
            }
            void autofillNutrition(text);
          },
        },
      ],
    });
  };

  const buildRecipeInput = (
    current: RecipeForm,
    title: string,
  ): RouterInputs["recipes"]["createRecipe"] => ({
    title,
    description: current.description || "",
    yield: current.yield || "",
    activeTime: current.activeTime || "",
    totalTime: current.totalTime || "",
    source: current.source || "",
    url: current.url || "",
    notes: current.notes || "",
    ingredients: current.ingredients || "",
    instructions: current.instructions || "",
    rating: current.rating || null,
    folder: "main",
    imageIds: images.map((image) => image.id),
    labelIds: selectedLabels.map((label) => label.id),
    lastMadeAt: current.lastMadeAt || null,
    linkedRecipeIds: selectedLinkedRecipes.map((recipe) => recipe.id),
    ...recipeFormUtils.nutritionFromForm(current),
  });

  const performSave = async (current: RecipeForm) => {
    if (!current.title) return;
    if (savingRef.current) return;

    const loading = loadingService.start();
    savingRef.current = true;
    setSaving(true);

    const response = await (current.id
      ? serverActions.recipes.updateRecipe({
          id: current.id,
          ...buildRecipeInput(current, current.title),
        })
      : serverActions.recipes.createRecipe(
          buildRecipeInput(current, current.title),
        ));

    loading.dismiss();
    savingRef.current = false;
    setSaving(false);
    if (!response) return;

    markAsClean();

    void navigate({
      to: "/recipe/$recipeId",
      params: { recipeId: response.id },
      replace: true,
    });
  };

  const saveCheckConflict = async (current: RecipeForm) => {
    if (!current.title) return;

    const loading = loadingService.start();

    const conflictingRecipes = await serverActions.recipes.getRecipesByTitle({
      title: current.title,
    });

    const uniqueTitle = await serverActions.recipes.getUniqueRecipeTitle({
      title: current.title,
      ignoreIds: current.id ? [current.id] : undefined,
    });

    loading.dismiss();
    if (!conflictingRecipes || !uniqueTitle) return;

    // We do not want to warn user if they haven't modified the title
    const hasTitleChanged = originalTitle !== current.title;
    if (
      hasTitleChanged &&
      conflictingRecipes.some((recipe) => recipe.id !== current.id)
    ) {
      await showAlert({
        header: t("pages.editRecipe.conflict.title"),
        message: t("pages.editRecipe.conflict.message", {
          title: current.title,
          uniqueTitle,
        }),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
          },
          {
            text: t("pages.editRecipe.conflict.rename"),
            handler: () => {
              const renamed = { ...current, title: uniqueTitle };
              setForm(renamed);
              void performSave(renamed);
            },
          },
          {
            text: t("pages.editRecipe.conflict.ignore"),
            handler: () => {
              void performSave(current);
            },
          },
        ],
      });
    } else {
      await performSave(current);
    }
  };

  const getMissingWarnLabelGroups = () => {
    const warnLabelGroupsById = new Map<string, LabelGroupSummary>(
      labelGroups
        .filter((labelGroup) => labelGroup.warnWhenNotPresent)
        .map((labelGroup) => [labelGroup.id, labelGroup]),
    );
    const missingLabelGroupIds = new Set(warnLabelGroupsById.keys());

    for (const selectedLabel of selectedLabels) {
      if (!selectedLabel.labelGroupId) continue;
      missingLabelGroupIds.delete(selectedLabel.labelGroupId);
    }

    return Array.from(missingLabelGroupIds)
      .map((id) => warnLabelGroupsById.get(id))
      .filter((labelGroup) => labelGroup !== undefined);
  };

  const save = async () => {
    const current = { ...form, title: form.title.trim() };
    setForm(current);

    if (!current.title) {
      await presentAlert(
        t("generic.error"),
        t("pages.editRecipe.titleRequired"),
        t("generic.okay"),
      );
      return;
    }

    if (recipeFormUtils.hasInvalidNutritionFields(current)) {
      await presentAlert(
        t("generic.error"),
        t("pages.editRecipe.nutritionInvalid"),
        t("generic.okay"),
      );
      return;
    }

    const missingWarnLabelGroup = getMissingWarnLabelGroups().at(0);
    if (missingWarnLabelGroup) {
      await showAlert({
        header: t("pages.editRecipe.missingLabelGroup.title"),
        message: t("pages.editRecipe.missingLabelGroup.message", {
          groupName: missingWarnLabelGroup.title,
        }),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
          },
          {
            text: t("generic.ignore"),
            handler: () => {
              void saveCheckConflict(current);
            },
          },
        ],
      });
    } else {
      await saveCheckConflict(current);
    }
  };

  const scanDocument = async () => {
    if (!(await thirdPartyAiConsentService.ensureConsent())) return;

    setClipDocumentIncludeNutrition(false);
    setIsClipDocumentModalOpen(true);
  };

  const applyScannedDocument = async (
    file: PickFilesResult["files"][number],
    extension: string,
    includeNutrition: boolean,
  ) => {
    const blob = await (async () => {
      if (file.blob) return file.blob;
      if (!file.path) return undefined;

      const webPath = Capacitor.convertFileSrc(file.path);
      const response = await fetch(webPath);
      return response.blob();
    })();
    if (!blob) return;

    const webFile = new File([blob], `scan${extension}`, {
      type: file.mimeType || "application/octet-stream",
    });

    const errorHandlers = getDocumentErrorHandlers();

    const response =
      extension === ".pdf"
        ? await mlService.getRecipeFromPDF(webFile, errorHandlers)
        : await mlService.getRecipeFromDocument(webFile, errorHandlers);

    if (!response.success) return;

    applyContentFields(response.data.recipe);

    const nutritionInfo = response.data.recipe.nutritionInfo;
    if (includeNutrition && nutritionInfo) {
      await parseAndApplyNutrition(nutritionInfo);
    }
  };

  const performScanDocument = async (includeNutrition: boolean) => {
    let filePickerResult: PickFilesResult;
    try {
      filePickerResult = await FilePicker.pickFiles({
        types: SUPPORTED_DOCUMENT_MIME_TYPES,
        limit: 1,
      });
    } catch {
      return;
    }

    const file = filePickerResult.files.at(0);
    if (!file) return;

    const extension = getDocumentExtension(file.name);

    const loading = showLoadingOverlay(t("pages.editRecipe.clip.loading"));

    try {
      await applyScannedDocument(file, extension, includeNutrition);
    } finally {
      loading.dismiss();
    }
  };

  const submitClipDocument = () => {
    const includeNutrition = clipDocumentIncludeNutrition;
    setIsClipDocumentModalOpen(false);
    void performScanDocument(includeNutrition);
  };

  const scanImage = async () => {
    if (!(await thirdPartyAiConsentService.ensureConsent())) return;

    const capturedPhotos: Photo[] = [];
    while (true) {
      try {
        capturedPhotos.push(
          await Camera.getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Prompt,
            direction: CameraDirection.Rear,
            quality: 85,
            allowEditing: true,
            width: 2160,
            webUseInput: true,
          }),
        );

        if (capturedPhotos.length >= MAX_IMAGES_SCAN) break;

        const result = await showAlert({
          header: t("pages.editRecipe.clipImage.selectMore.header"),
          message: t("pages.editRecipe.clipImage.selectMore.message", {
            maxCount: MAX_IMAGES_SCAN,
          }),
          buttons: [
            {
              text: t("generic.yes"),
              role: "yes",
            },
            {
              text: t("generic.no"),
              role: "no",
            },
          ],
        });
        if (result.role === "no") break;
      } catch {
        break;
      }
    }

    if (!capturedPhotos.length) return;

    const files: File[] = [];
    const success = await applyRecipeFromFile(async () => {
      for (const capturedPhoto of capturedPhotos) {
        const webPath =
          capturedPhoto.webPath ||
          (capturedPhoto.path
            ? Capacitor.convertFileSrc(capturedPhoto.path)
            : undefined);
        if (!webPath) continue;
        const response = await fetch(webPath);
        const blob = await response.blob();
        const webFile = new File([blob], `scan.${capturedPhoto.format}`, {
          type: `image/${capturedPhoto.format}`,
        });
        files.push(webFile);
      }

      return mlService.getRecipeFromOCR(files, getDocumentErrorHandlers());
    });
    if (!success) return;

    await uploadFirstScanImage(files);
  };

  const clipFromText = async () => {
    if (!(await thirdPartyAiConsentService.ensureConsent())) return;

    setClipTextInput("");
    setClipTextIncludeNutrition(false);
    setIsClipTextModalOpen(true);
  };

  const clipFromTextInternal = async (
    text: string,
    includeNutrition: boolean,
  ) => {
    const loading = showLoadingOverlay(t("pages.editRecipe.clip.loading"));

    const response = await serverActions.ml.getRecipeFromText(
      {
        text,
      },
      {
        ...getSelfhostErrorHandlers(),
        400: () => presentClipFailed(),
      },
    );

    if (!response) {
      loading.dismiss();
      return;
    }

    applyContentFields(response.recipe);

    if (includeNutrition && response.recipe.nutritionInfo) {
      await parseAndApplyNutrition(response.recipe.nutritionInfo);
    }

    loading.dismiss();
  };

  const submitClipText = async () => {
    if (!clipTextInput || clipTextInput.length < 10) {
      await presentAlert(
        t("generic.error"),
        t("pages.editRecipe.clipText.invalid"),
        t("generic.okay"),
      );
      return;
    }
    setIsClipTextModalOpen(false);
    void clipFromTextInternal(clipTextInput, clipTextIncludeNutrition);
  };

  const clipFromUrl = () => {
    setClipUrlInput("");
    setClipUrlIncludeNutrition(false);
    setIsClipUrlModalOpen(true);
  };

  const submitClipUrl = async () => {
    if (!clipUrlInput || !isValidHttpUrl(clipUrlInput)) {
      await presentAlert(
        t("generic.error"),
        t("pages.editRecipe.clipURL.invalidUrl"),
        t("generic.okay"),
      );
      return;
    }
    const url = clipUrlInput;
    const includeNutrition = clipUrlIncludeNutrition;
    if (isUnsupportedSiteUrl(clipUrlInput)) {
      setIsClipUrlModalOpen(false);
      await showAlert({
        header: t("generic.warning"),
        message: t("pages.editRecipe.clipURL.unsupportedSiteUrl"),
        buttons: [
          {
            text: t("generic.okay"),
            handler: () => {
              void clipFromUrlInternal(url, includeNutrition);
            },
          },
        ],
      });
      return;
    }
    setIsClipUrlModalOpen(false);
    void clipFromUrlInternal(url, includeNutrition);
  };

  const presentAddImageByUrlFailed = () =>
    presentAlert(
      t("generic.error"),
      t("pages.editRecipe.addImage.fetchFailed"),
      t("generic.okay"),
    );

  const addImageByUrl = async (rawImageUrl: string) => {
    const imageUrl = rawImageUrl.trim();
    if (!imageUrl) return;

    if (isValidHttpUrl(imageUrl)) {
      const loading = showLoadingOverlay(
        t("pages.editRecipe.addImage.downloading"),
      );

      const response = await serverActions.images.createRecipeImageFromUrl(
        {
          url: imageUrl,
        },
        {
          400: () => presentAddImageByUrlFailed(),
          415: () => presentAddImageByUrlFailed(),
        },
      );
      if (response) {
        setImages((prev) => [...prev, response]);
        markAsDirty();
      }

      loading.dismiss();
    } else {
      await presentAlert(
        t("generic.error"),
        t("pages.editRecipe.addImage.invalidUrl"),
        t("generic.okay"),
      );
    }
  };

  const addImageByUrlPrompt = () => {
    setAddImageByUrlInput("");
    setIsAddImageByUrlModalOpen(true);
  };

  const submitAddImageByUrl = () => {
    const imageUrl = addImageByUrlInput;
    setIsAddImageByUrlModalOpen(false);
    if (imageUrl) void addImageByUrl(imageUrl);
  };

  // Note that this is, in effect, just a change for the correlated group
  const selectedLabelsChange = (
    labelGroupId: string | null,
    updatedSelectedLabelsForGroup: SelectableItem[],
  ) => {
    const labelsById = new Map(labels.map((label) => [label.id, label]));

    const unrelatedSelectedLabels = selectedLabels.filter(
      (selectedLabel) => selectedLabel.labelGroupId !== labelGroupId,
    );

    const updatedSelectedLabels = [
      ...unrelatedSelectedLabels,
      ...updatedSelectedLabelsForGroup,
    ]
      .map((selectedLabel) => labelsById.get(selectedLabel.id))
      .filter((label) => label !== undefined);

    const previousIds = selectedLabels
      .map((label) => label.id)
      .sort()
      .join(",");
    const updatedIds = updatedSelectedLabels
      .map((label) => label.id)
      .sort()
      .join(",");

    if (previousIds === updatedIds) return;

    setSelectedLabels(updatedSelectedLabels);
    markAsDirty();
  };

  const addLabel = async (title: string, labelGroupId: string | null) => {
    if (!title.trim()) return;

    const label = await serverActions.labels.createLabel({
      title,
      labelGroupId,
    });
    if (!label) return;

    setExtraLabels((prev) => [...prev, label]);
    setSelectedLabels((prev) => [...prev, label]);
    markAsDirty();
  };

  const setLastMadeAtToday = () => {
    setField("lastMadeAt", dayjs().format("YYYY-MM-DD"));
  };

  const linkedRecipeSelected = (recipe: RecipeSummary | undefined) => {
    if (!recipe) return;

    const alreadyLinked = selectedLinkedRecipes.find(
      (linkedRecipe) => linkedRecipe.id === recipe.id,
    );
    if (alreadyLinked) return;

    if (recipe.id === recipeId) {
      return;
    }

    setSelectedLinkedRecipes((prev) => [...prev, toLinkedRecipe(recipe)]);
    markAsDirty();
  };

  const removeLinkedRecipe = (linkedRecipeId: string) => {
    setSelectedLinkedRecipes((prev) =>
      prev.filter((linkedRecipe) => linkedRecipe.id !== linkedRecipeId),
    );
    markAsDirty();
  };

  const canAddImages =
    images.length < 10 && (images.length === 0 || multipleImagesCapable);

  return (
    <>
      <PageHeader
        start={
          <BackButton
            fallback={
              recipeId
                ? { to: "/recipe/$recipeId", params: { recipeId } }
                : { to: "/list/$folder", params: { folder: "main" } }
            }
          />
        }
        title={
          form.id
            ? t("pages.editRecipe.title.edit")
            : t("pages.editRecipe.title.new")
        }
        end={
          <EditRecipePopover
            canAddImages={canAddImages}
            addImageByUrlPrompt={addImageByUrlPrompt}
          />
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

        <div className="mx-auto max-w-[1200px] p-4">
          {!form.id && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="lg" />}>
                <ScissorsIcon data-icon="inline-start" />
                {t("pages.editRecipe.showClipOptions")}
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-auto min-w-64">
                <DropdownMenuItem className="min-h-10" onClick={clipFromUrl}>
                  <LinkIcon />
                  {t("pages.editRecipe.autoclip")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-10"
                  onClick={() => void clipFromText()}
                >
                  <FileTextIcon />
                  {t("pages.editRecipe.clipText")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-10"
                  onClick={() => void scanImage()}
                >
                  <CameraIcon />
                  {t("pages.editRecipe.scanImage")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="min-h-10"
                  onClick={() => void scanDocument()}
                >
                  <FileTextIcon />
                  {t("pages.editRecipe.scanDocument")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <AlertModal
            open={isClipTextModalOpen}
            onOpenChange={setIsClipTextModalOpen}
            header={t("pages.editRecipe.clipText.header")}
            message={t("pages.editRecipe.clipText.message")}
            onConfirm={() => void submitClipText()}
          >
            <TextArea
              value={clipTextInput}
              onValueChange={setClipTextInput}
              placeholder={t("pages.editRecipe.clipText.placeholder")}
              rows={4}
            />
            <Label className="font-normal">
              <Checkbox
                checked={clipTextIncludeNutrition}
                onCheckedChange={setClipTextIncludeNutrition}
              />
              {t("pages.editRecipe.clip.includeNutrition")}
            </Label>
          </AlertModal>

          <AlertModal
            open={isClipUrlModalOpen}
            onOpenChange={setIsClipUrlModalOpen}
            header={t("pages.editRecipe.clipURL.header")}
            message={t("pages.editRecipe.clipURL.message")}
            onConfirm={() => void submitClipUrl()}
          >
            <TextField
              type="url"
              value={clipUrlInput}
              onValueChange={setClipUrlInput}
              placeholder={t("pages.editRecipe.clipURL.placeholder")}
            />
            <Label className="font-normal">
              <Checkbox
                checked={clipUrlIncludeNutrition}
                onCheckedChange={setClipUrlIncludeNutrition}
              />
              {t("pages.editRecipe.clip.includeNutrition")}
            </Label>
          </AlertModal>

          <AlertModal
            open={isClipDocumentModalOpen}
            onOpenChange={setIsClipDocumentModalOpen}
            header={t("pages.editRecipe.clipDocument.header")}
            message={t("pages.editRecipe.clipDocument.message")}
            confirmLabel={t("pages.editRecipe.clipDocument.choose")}
            onConfirm={submitClipDocument}
          >
            <Label className="font-normal">
              <Checkbox
                checked={clipDocumentIncludeNutrition}
                onCheckedChange={setClipDocumentIncludeNutrition}
              />
              {t("pages.editRecipe.clip.includeNutrition")}
            </Label>
          </AlertModal>

          <AlertModal
            open={isAddImageByUrlModalOpen}
            onOpenChange={setIsAddImageByUrlModalOpen}
            header={t("pages.editRecipe.addImage.header")}
            message={t("pages.editRecipe.addImage.message")}
            confirmLabel={t("generic.confirm")}
            onConfirm={submitAddImageByUrl}
          >
            <TextField
              type="url"
              value={addImageByUrlInput}
              onValueChange={setAddImageByUrlInput}
              placeholder={t("pages.editRecipe.addImage.placeholder")}
            />
          </AlertModal>

          <div className="mt-10 flex flex-col gap-4">
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

            <div className="flex flex-wrap items-start gap-x-5 gap-y-4 [&>*]:min-w-[260px] [&>*]:flex-[1_1_30%]">
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

              <TextField
                label={t("pages.editRecipe.input.source")}
                value={form.source}
                onValueChange={(value) => setField("source", value)}
                type="text"
                autoCapitalize="on"
                autoCorrect="on"
              />

              <TextField
                label={t("pages.editRecipe.input.sourceUrl")}
                value={form.url}
                onValueChange={(value) => setField("url", value)}
                type="url"
                autoCapitalize="on"
                autoCorrect="on"
              />

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldTitle>{t("pages.editRecipe.input.rating")}</FieldTitle>
                  <Rating
                    rating={form.rating}
                    enableEdit
                    className="text-[1.375rem]"
                    onRatingChange={(rating) => {
                      setForm((prev) => ({ ...prev, rating }));
                      markAsDirty();
                    }}
                  />
                </Field>

                {form.lastMadeAt ? (
                  <TextField
                    label={t("pages.editRecipe.input.lastMadeAt")}
                    type="date"
                    value={form.lastMadeAt}
                    onValueChange={(value) => setField("lastMadeAt", value)}
                  />
                ) : (
                  <Field>
                    <FieldTitle>
                      {t("pages.editRecipe.input.lastMadeAt")}
                    </FieldTitle>
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ms-3 h-auto min-h-7 text-start whitespace-normal text-primary"
                        onClick={setLastMadeAtToday}
                      >
                        {t("pages.editRecipe.input.lastMadeAt.never")}
                      </Button>
                    </div>
                  </Field>
                )}
              </div>
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

            <EditRecipeNutrition
              form={form}
              onFieldChange={setField}
              onAutofill={() => void autofillNutritionFromText()}
              onClear={() => void confirmClearNutrition()}
            />
          </div>

          <br />

          <EditRecipeLinkedRecipes
            linkedRecipes={selectedLinkedRecipes}
            onLinkedRecipeSelected={linkedRecipeSelected}
            onRemoveLinkedRecipe={removeLinkedRecipe}
          />

          <br />

          <EditRecipeLabels
            labels={labels}
            labelGroups={labelGroups}
            selectedLabels={selectedLabels}
            onSelectedLabelsChange={selectedLabelsChange}
            onAddLabel={(title, labelGroupId) =>
              void addLabel(title, labelGroupId)
            }
          />

          <div className="p-4">
            <Button
              size="lg"
              className="w-full"
              disabled={saving}
              onClick={() => void save()}
            >
              {form.id
                ? t("pages.editRecipe.save")
                : t("pages.editRecipe.create")}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
};

export const EditRecipePage = () => {
  const { recipeId } = routeApi.useParams();
  const resolvedRecipeId =
    recipeId && recipeId !== "new" ? recipeId : undefined;

  return (
    <EditRecipeEditor
      key={resolvedRecipeId || "new"}
      recipeId={resolvedRecipeId}
    />
  );
};
