import MiniSearch, {
  type Options,
  type Query,
  type SearchResult,
} from "minisearch";
import { IDBPDatabase } from "idb";
import {
  getKvStoreEntry,
  KVStoreKeys,
  ObjectStoreName,
  RSLocalDB,
} from "./localDb";
import type { RecipeSummary } from "@recipesage/prisma";
import { unaccent } from "./unaccent";

/**
 * Enables some additional logging which is helpful for debugging
 */
const ENABLE_VERBOSE_INDEX_LOGGING = false;

/**
 * The amount of debounce time before saving the search index to disk.
 * Time re-extends by this amount every time a change is made to the index.
 */
const SEARCH_DB_SAVE_TIMEOUT_SECONDS = 10;
/**
 * The maximum allowable float time that the search index won't be saved to disk.
 * Effectively a cap for SEARCH_DB_SAVE_TIMEOUT_MS.
 */
const SEARCH_DB_SAVE_MAX_TIMEOUT_SECONDS = 120;

const SEARCH_INDEX_VERSION = 2;

const SEARCH_IDLE_SAVE_TIMEOUT_MS = 2000;

const SEARCH_RESULT_LIMIT = 500;

const SEARCH_FIELD_BOOSTS = {
  title: 3,
  description: 2,
  ingredients: 2,
  source: 1,
  notes: 1,
};

export interface StoredSearchFields {
  recipeId: string;
  recipeTitle: string | undefined;
}

export class SearchManager {
  private miniSearch: MiniSearch;
  private knownRecipeIds = new Set<string>();
  private miniSearchOptions = {
    fields: Object.keys(SEARCH_FIELD_BOOSTS),
    storeFields: ["recipeId", "recipeTitle"],
    processTerm: (term: string) => unaccent(term.toLowerCase()),
  } satisfies Options;
  private initPromise: Promise<void>;
  private saveTimeout: NodeJS.Timeout | undefined;
  private maxSaveTimeout: NodeJS.Timeout | undefined;

  constructor(private localDb: IDBPDatabase<RSLocalDB>) {
    this.miniSearch = new MiniSearch(this.miniSearchOptions);
    this.initPromise = this.populateFromLocalDb();
  }

  search(
    text: Query,
    limit = SEARCH_RESULT_LIMIT,
  ): (SearchResult & StoredSearchFields)[] {
    return this.miniSearch
      .search(text, {
        prefix: true,
        boost: SEARCH_FIELD_BOOSTS,
        fuzzy: 1,
      })
      .slice(0, limit) as (SearchResult & StoredSearchFields)[]; // Thanks minisearch typings...
  }

  async populateFromLocalDb() {
    performance.mark("startIndexLoad");

    const [indexRecord, indexVersion] = await Promise.all([
      getKvStoreEntry(KVStoreKeys.RecipeSearchIndex),
      getKvStoreEntry(KVStoreKeys.RecipeSearchIndexVersion),
    ]);

    if (!indexRecord) return;

    if (indexVersion !== SEARCH_INDEX_VERSION) {
      await this.rebuildFromLocalRecipes();
      return;
    }

    try {
      this.miniSearch = MiniSearch.loadJSON(
        indexRecord,
        this.miniSearchOptions,
      );

      this.repopulateKnownIds();
    } catch (e) {
      console.error("Failed to load MiniSearch index from local DB", e);
      await this.rebuildFromLocalRecipes();
    }

    performance.mark("endIndexLoad");
    const measure = performance.measure(
      "indexLoadTime",
      "startIndexLoad",
      "endIndexLoad",
    );
    console.log(
      `Loading index took ${measure.duration}ms. ${this.knownRecipeIds.size} artifacts loaded.`,
    );
  }

  private async rebuildFromLocalRecipes(): Promise<void> {
    const recipes = await this.localDb.getAll(ObjectStoreName.Recipes);

    this.miniSearch = new MiniSearch(this.miniSearchOptions);
    this.miniSearch.addAll(recipes.map((recipe) => this.toIndexDoc(recipe)));
    this.repopulateKnownIds();

    await this.saveToLocalDB();
  }

  private toIndexDoc(recipe: RecipeSummary) {
    return {
      id: recipe.id,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      title: recipe.title ?? "",
      description: recipe.description ?? "",
      ingredients: recipe.ingredients ?? "",
      notes: recipe.notes ?? "",
      source: recipe.source ?? "",
    };
  }

  repopulateKnownIds() {
    const storedFields = this.getStoredFields();

    this.knownRecipeIds = new Set();
    for (const storedField of storedFields) {
      this.knownRecipeIds.add(storedField.recipeId);
    }
  }

  /**
   * Helps get around the fact that _storedFields is a protected property
   * and we don't want to have a ts-expect-error floating everywhere
   */
  private getStoredFields(): IterableIterator<StoredSearchFields> {
    // @ts-expect-error _storedFields is a protected property
    return this.miniSearch._storedFields.values();
  }

  getStoredFieldsForRecipeId(recipeId: string): StoredSearchFields | undefined {
    return this.miniSearch.getStoredFields(recipeId) as
      | StoredSearchFields
      | undefined;
  }

  onReady(): Promise<void> {
    return this.initPromise;
  }

  getKnownIndexIds(): ReadonlySet<string> {
    return this.knownRecipeIds;
  }

  async unindexRecipe(recipeId: string): Promise<void> {
    await this.initPromise;

    if (this.miniSearch.has(recipeId)) {
      this.miniSearch.discard(recipeId);
    }
    this.knownRecipeIds.delete(recipeId);

    this.scheduleSave();
  }

  async indexRecipe(recipe: RecipeSummary): Promise<void> {
    await this.initPromise;

    const recipeIndexDoc = this.toIndexDoc(recipe);
    if (this.miniSearch.has(recipe.id)) {
      this.miniSearch.replace(recipeIndexDoc);
    } else {
      this.miniSearch.add(recipeIndexDoc);
    }
    this.knownRecipeIds.add(recipe.id);

    if (ENABLE_VERBOSE_INDEX_LOGGING)
      console.log(`Updated search index for ${recipe.id}`);

    this.scheduleSave();
  }

  scheduleSave() {
    clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(() => {
      this.saveWhenIdle();
    }, SEARCH_DB_SAVE_TIMEOUT_SECONDS * 1000);

    if (!this.maxSaveTimeout) {
      this.maxSaveTimeout = setTimeout(() => {
        this.saveWhenIdle();
      }, SEARCH_DB_SAVE_MAX_TIMEOUT_SECONDS * 1000);
    }
  }

  private saveWhenIdle() {
    const save = () =>
      this.saveToLocalDB().catch((e) =>
        console.error("Failed to save MiniSearch index to local DB", e),
      );

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(save, { timeout: SEARCH_IDLE_SAVE_TIMEOUT_MS });
      return;
    }

    save();
  }

  async saveToLocalDB(): Promise<void> {
    clearTimeout(this.saveTimeout);
    clearTimeout(this.maxSaveTimeout);
    this.saveTimeout = undefined;
    this.maxSaveTimeout = undefined;

    await Promise.all([
      this.localDb.put(ObjectStoreName.KV, {
        key: KVStoreKeys.RecipeSearchIndex,
        value: JSON.stringify(this.miniSearch),
      }),
      this.localDb.put(ObjectStoreName.KV, {
        key: KVStoreKeys.RecipeSearchIndexVersion,
        value: SEARCH_INDEX_VERSION,
      }),
    ]);
  }

  async destroy(): Promise<void> {
    await this.saveToLocalDB();
    clearTimeout(this.saveTimeout);
    clearTimeout(this.maxSaveTimeout);
  }
}
