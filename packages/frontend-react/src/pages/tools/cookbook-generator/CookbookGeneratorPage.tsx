import { useId, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  BookOpenIcon,
  CircleMinusIcon,
  GripVerticalIcon,
  PlusIcon,
  TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { openSelectLabelModal } from "../../../components/select-label-modal/openSelectLabelModal";
import { openSelectRecipeModal } from "../../../components/select-recipe-modal/openSelectRecipeModal";
import { serverActions } from "../../../services/serverActions";
import { createHistoryEntrySnapshotStore } from "../createHistoryEntrySnapshotStore";

const MAX_RECIPES = 1000;
const RECIPE_PAGE_SIZE = 200;

interface CookbookRecipe {
  id: string;
  title: string;
}

interface CookbookGeneratorSnapshot {
  title: string;
  subtitle: string;
  introduction: string;
  author: string;
  includeToc: boolean;
  includeImages: boolean;
  includeLabels: boolean;
  includeLastMade: boolean;
  includeLinkedRecipes: boolean;
  includeRecipeSageUrl: boolean;
  recipes: CookbookRecipe[];
}

const snapshotStore =
  createHistoryEntrySnapshotStore<CookbookGeneratorSnapshot>();

const ToggleRow = ({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex min-h-12 cursor-pointer items-center gap-4 border-b px-4 py-2"
    >
      <span className="min-w-0 flex-1 text-base break-words">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
};

const CookbookRecipeRow = ({
  recipe,
  index,
  onRemove,
}: {
  recipe: CookbookRecipe;
  index: number;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const { ref, handleRef, isDragging } = useSortable({
    id: recipe.id,
    index,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-h-12 items-center gap-2 border-b bg-background ps-2 pe-2",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-destructive hover:text-destructive"
        aria-label={t("pages.nutritionCalculator.recipes.remove")}
        onClick={onRemove}
      >
        <CircleMinusIcon className="size-5" />
      </Button>
      <span dir="auto" className="min-w-0 flex-1 py-2 break-words">
        {recipe.title}
      </span>
      <button
        type="button"
        ref={handleRef}
        aria-label={t("generic.reorder")}
        className="flex size-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-5" />
      </button>
    </div>
  );
};

export const CookbookGeneratorPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const restored = snapshotStore.useRestoredSnapshot();

  const [title, setTitle] = useState(() => restored?.title ?? "");
  const [subtitle, setSubtitle] = useState(() => restored?.subtitle ?? "");
  const [introduction, setIntroduction] = useState(
    () => restored?.introduction ?? "",
  );
  const [author, setAuthor] = useState(() => restored?.author ?? "");
  const [includeToc, setIncludeToc] = useState(
    () => restored?.includeToc ?? true,
  );
  const [includeImages, setIncludeImages] = useState(
    () => restored?.includeImages ?? true,
  );
  const [includeLabels, setIncludeLabels] = useState(
    () => restored?.includeLabels ?? false,
  );
  const [includeLastMade, setIncludeLastMade] = useState(
    () => restored?.includeLastMade ?? false,
  );
  const [includeLinkedRecipes, setIncludeLinkedRecipes] = useState(
    () => restored?.includeLinkedRecipes ?? false,
  );
  const [includeRecipeSageUrl, setIncludeRecipeSageUrl] = useState(
    () => restored?.includeRecipeSageUrl ?? false,
  );

  const [recipes, setRecipes] = useState<CookbookRecipe[]>(
    () => restored?.recipes ?? [],
  );
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [startingJob, setStartingJob] = useState(false);

  snapshotStore.useSaveSnapshot({
    title,
    subtitle,
    introduction,
    author,
    includeToc,
    includeImages,
    includeLabels,
    includeLastMade,
    includeLinkedRecipes,
    includeRecipeSageUrl,
    recipes,
  });

  const addRecipes = (newRecipes: CookbookRecipe[]) => {
    setRecipes((prev) => {
      const existingIds = new Set(prev.map((recipe) => recipe.id));
      const next = [...prev];
      for (const recipe of newRecipes) {
        if (existingIds.has(recipe.id)) continue;
        existingIds.add(recipe.id);
        next.push(recipe);
      }
      return next;
    });
  };

  const addRecipe = async () => {
    const data = await openSelectRecipeModal();
    if (!data) return;
    addRecipes([{ id: data.id, title: data.title }]);
  };

  const addRecipesFromLabel = async (labelTitle: string) => {
    setLoadingRecipes(true);

    const collected = new Map<string, CookbookRecipe>();
    try {
      let offset = 0;
      while (true) {
        const response = await serverActions.recipes.getRecipes({
          folder: "main",
          orderBy: "title",
          orderDirection: "asc",
          offset,
          limit: RECIPE_PAGE_SIZE,
          labels: [labelTitle],
        });
        if (!response) break;

        for (const recipe of response.recipes) {
          collected.set(recipe.id, { id: recipe.id, title: recipe.title });
        }
        offset += response.recipes.length;

        if (response.recipes.length === 0 || offset >= response.totalCount) {
          break;
        }
      }
    } finally {
      setLoadingRecipes(false);
    }

    addRecipes([...collected.values()]);
  };

  const addLabel = async () => {
    const data = await openSelectLabelModal();
    if (!data) return;
    await addRecipesFromLabel(data.title);
  };

  const removeRecipe = (recipe: CookbookRecipe) => {
    setRecipes((prev) => prev.filter((item) => item.id !== recipe.id));
  };

  const onReorder = (from: number, to: number) => {
    if (from === to) return;
    setRecipes((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (item) next.splice(to, 0, item);
      return next;
    });
  };

  const canGenerate =
    title.trim().length > 0 &&
    recipes.length > 0 &&
    recipes.length <= MAX_RECIPES;

  const generate = async () => {
    if (!canGenerate || startingJob) return;

    setStartingJob(true);
    let response;
    try {
      response = await serverActions.jobs.startCookbookJob({
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        introduction: introduction.trim() || undefined,
        author: author.trim() || undefined,
        includeToc,
        includeImages,
        includeLabels,
        includeLastMade,
        includeLinkedRecipes,
        includeRecipeSageUrl,
        recipeIds: recipes.map((recipe) => recipe.id),
      });
    } finally {
      setStartingJob(false);
    }

    if (response) {
      void navigate({ to: "/settings/jobs" });
    }
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.cookbook.title")}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-[25vh]">
          <InfoBlock
            className="m-4"
            icon={<BookOpenIcon />}
            title={t("pages.cookbook.intro.title")}
          >
            <p>{t("pages.cookbook.intro.body")}</p>
            <p>
              <Link to="/settings/export">
                {t("pages.cookbook.intro.exportLink")}
              </Link>
            </p>
          </InfoBlock>

          <div className="flex flex-col gap-4 px-4 py-2">
            <TextField
              label={t("pages.cookbook.field.title")}
              value={title}
              onValueChange={setTitle}
            />
            <TextField
              label={t("pages.cookbook.field.subtitle")}
              value={subtitle}
              onValueChange={setSubtitle}
            />
            <TextField
              label={t("pages.cookbook.field.author")}
              value={author}
              onValueChange={setAuthor}
            />
            <TextArea
              label={t("pages.cookbook.field.introduction")}
              value={introduction}
              onValueChange={setIntroduction}
              autoGrow
            />
          </div>

          <div className="mt-2">
            <ToggleRow
              label={t("pages.cookbook.field.toc")}
              checked={includeToc}
              onCheckedChange={setIncludeToc}
            />
            <ToggleRow
              label={t("pages.cookbook.field.includeImages")}
              checked={includeImages}
              onCheckedChange={setIncludeImages}
            />
            <ToggleRow
              label={t("pages.cookbook.field.includeLabels")}
              checked={includeLabels}
              onCheckedChange={setIncludeLabels}
            />
            <ToggleRow
              label={t("pages.cookbook.field.includeLastMade")}
              checked={includeLastMade}
              onCheckedChange={setIncludeLastMade}
            />
            <ToggleRow
              label={t("pages.cookbook.field.includeLinkedRecipes")}
              checked={includeLinkedRecipes}
              onCheckedChange={setIncludeLinkedRecipes}
            />
            <ToggleRow
              label={t("pages.cookbook.field.includeRecipeSageUrl")}
              checked={includeRecipeSageUrl}
              onCheckedChange={setIncludeRecipeSageUrl}
            />
          </div>

          <section className="mt-4">
            <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-2">
              <h2 className="me-auto text-lg font-semibold">
                {t("pages.cookbook.recipes.title")}
              </h2>
              <Button size="sm" onClick={() => void addRecipe()}>
                <PlusIcon data-icon="inline-start" />
                {t("pages.cookbook.addRecipe.title")}
              </Button>
              <Button size="sm" onClick={() => void addLabel()}>
                <TagIcon data-icon="inline-start" />
                {t("pages.cookbook.addLabel.title")}
              </Button>
            </div>

            {loadingRecipes && (
              <div className="flex items-center gap-4 px-4 py-3">
                <Spinner className="size-6" />
                <span>{t("pages.cookbook.recipes.loading")}</span>
              </div>
            )}

            {recipes.length > 0 ? (
              <DragDropProvider
                onDragEnd={(event) => {
                  if (event.canceled) return;
                  const { source } = event.operation;
                  if (!isSortable(source)) return;
                  onReorder(source.initialIndex, source.index);
                }}
              >
                <div className="flex flex-col">
                  {recipes.map((recipe, index) => (
                    <CookbookRecipeRow
                      key={recipe.id}
                      recipe={recipe}
                      index={index}
                      onRemove={() => removeRecipe(recipe)}
                    />
                  ))}
                </div>
              </DragDropProvider>
            ) : (
              !loadingRecipes && (
                <p className="px-4 py-3">{t("pages.cookbook.recipes.empty")}</p>
              )
            )}
          </section>

          <div className="p-4">
            {recipes.length > MAX_RECIPES && (
              <p className="mb-2 text-sm text-destructive">
                {t("pages.cookbook.recipes.tooMany", { max: MAX_RECIPES })}
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={!canGenerate || startingJob}
              onClick={() => void generate()}
            >
              {startingJob ? <Spinner /> : t("pages.cookbook.generate")}
            </Button>
          </div>
        </div>
      </PageContent>
    </>
  );
};
