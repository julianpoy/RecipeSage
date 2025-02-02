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

export interface StoredSearchFields {
  recipeId: string;
  recipeTitle: string | undefined;
}

export class SearchManager {
  private miniSearch: MiniSearch;
  private knownRecipeIds = new Set<string>();
  private miniSearchOptions = {
    fields: ["text"],
    storeFields: ["recipeId", "recipeTitle"],
  } satisfies Options;
  private initPromise = this.populateFromLocalDb();
  private saveTimeout: NodeJS.Timeout | undefined;
  private maxSaveTimeout: NodeJS.Timeout | undefined;

  constructor(private localDb: IDBPDatabase<RSLocalDB>) {
    this.miniSearch = new MiniSearch(this.miniSearchOptions);
  }

  search(text: Query): (SearchResult & StoredSearchFields)[] {
    return Array.from(
      this.miniSearch.search(text, {
        prefix: true,
      }),
    ) as (SearchResult & StoredSearchFields)[]; // Thanks minisearch typings...
  }

  async populateFromLocalDb() {
    performance.mark("startIndexLoad");

    const indexRecord = await getKvStoreEntry(KVStoreKeys.RecipeSearchIndex);

    if (!indexRecord) return;

    try {
      this.miniSearch = MiniSearch.loadJSON(
        indexRecord,
        this.miniSearchOptions,
      );

      this.repopulateKnownIds();
    } catch (e) {
      console.error("Failed to load MiniSearch index from local DB", e);
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

    this.miniSearch.discard(recipeId);
    this.knownRecipeIds.delete(recipeId);

    this.scheduleSave();
  }

  async indexRecipe(recipe: RecipeSummary): Promise<void> {
    await this.initPromise;

    const recipeIndexDoc = {
      id: recipe.id,
      recipeId: recipe.id,
      text: `
        ${recipe.title}
        ${recipe.description}
        ${recipe.ingredients}
        ${recipe.instructions}
      `,
    };
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
      this.saveToLocalDB();
    }, SEARCH_DB_SAVE_TIMEOUT_SECONDS * 1000);

    if (!this.maxSaveTimeout) {
      this.maxSaveTimeout = setTimeout(() => {
        this.saveToLocalDB();
      }, SEARCH_DB_SAVE_MAX_TIMEOUT_SECONDS * 1000);
    }
  }

  async saveToLocalDB(): Promise<void> {
    clearTimeout(this.saveTimeout);
    clearTimeout(this.maxSaveTimeout);

    await this.localDb.put(ObjectStoreName.KV, {
      key: KVStoreKeys.RecipeSearchIndex,
      value: JSON.stringify(this.miniSearch),
    });
  }

  async destroy(): Promise<void> {
    await this.saveToLocalDB();
    clearTimeout(this.saveTimeout);
    clearTimeout(this.maxSaveTimeout);
  }
}
