import { AlertController } from "@ionic/angular";
import { Injectable } from "@angular/core";

import { Label } from "./label.service";

import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { UtilService } from "./util.service";
import { EventName, EventService } from "./event.service";
import { Image } from "./image.service";

import {
  parseIngredients,
  parseInstructions,
  parseNotes,
} from "@recipesage/util";

export type RecipeFolderName = "main" | "inbox";

export interface BaseRecipe {
  title: string;
  description: string;
  yield: string;
  activeTime: string;
  totalTime: string;
  source: string;
  url: string;
  notes: string;
  ingredients: string;
  instructions: string;
  rating: number;
}

export interface Recipe extends BaseRecipe {
  id: string;
  labels: Label[];
  images: Image[];
  image: Image;
  fromUser?: any;
  fromUserId: string | null;
  folder: RecipeFolderName;
  isOwner?: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface ParsedIngredient {
  content: string;
  originalContent: string;
  isHeader: boolean;
  complete: boolean;
}

export interface ParsedInstruction {
  content: string;
  isHeader: boolean;
  complete: boolean;
  count: number;
}

export interface ParsedNote {
  content: string;
  isHeader: boolean;
}

export enum ExportFormat {
  XML = "xml",
  PDF = "pdf",
  TXT = "txt",
  JSONLD = "json-ld",
}

@Injectable({
  providedIn: "root",
})
export class RecipeService {
  constructor(
    public alertCtrl: AlertController,
    public events: EventService,
    public httpService: HttpService,
    public utilService: UtilService,
  ) {}

  getExportURL(format: ExportFormat) {
    return `${this.utilService.getBase()}data/export/${format}${this.utilService.getTokenQuery()}&download=true`;
  }

  count(
    params: {
      folder?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ count: number }>(
      `recipes/count`,
      "GET",
      undefined,
      params,
      errorHandlers,
    );
  }

  fetch(
    params: {
      folder?: RecipeFolderName;
      userId?: string;
      sort?: string;
      offset?: number;
      count?: number;
      labels?: string;
      labelIntersection?: boolean;
      ratingFilter?: string;
      includeFriends?: boolean;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{
      data: Recipe[];
      totalCount: number;
    }>(`recipes/by-page`, "GET", null, params, errorHandlers);
  }

  search(
    params: {
      query: string;
      userId?: string;
      labels?: string;
      rating?: number;
      ratingFilter?: string;
      includeFriends?: boolean;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{
      data: Recipe[];
    }>(`recipes/search`, "GET", undefined, params, errorHandlers);
  }

  fetchById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `recipes/${recipeId}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  getRecipeById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `recipes/${recipeId}`,
      "GET",
      undefined,
      undefined,
      errorHandlers,
    );
  }

  async create(
    payload: Partial<BaseRecipe> & {
      title: string;
      labels?: string[];
      imageIds?: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<Recipe>(
      `recipes`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeCreated);

    return response;
  }

  async update(
    payload: Partial<BaseRecipe> & {
      id: string;
      imageIds?: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<Recipe>(
      `recipes/${payload.id}`,
      "PUT",
      payload,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeUpdated);

    return response;
  }

  async deleteByLabelIds(
    payload: {
      labelIds: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>(
      `recipes/delete-by-labelIds`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeDeleted);

    return response;
  }

  async deleteBulk(
    payload: {
      recipeIds: string[];
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const response = await this.httpService.requestWithWrapper<void>(
      `recipes/delete-bulk`,
      "POST",
      payload,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeDeleted);

    return response;
  }

  async delete(recipeId: string, errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<void>(
      `recipes/${recipeId}`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeDeleted);

    return response;
  }

  async deleteAll(errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<void>(
      `recipes/all`,
      "DELETE",
      undefined,
      undefined,
      errorHandlers,
    );

    this.events.publish(EventName.RecipeDeleted);

    return response;
  }

  clipFromUrl(
    params: {
      url: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<any>(
      `clip`,
      "GET",
      undefined,
      params,
      errorHandlers,
    );
  }

  print(recipe: Recipe, template: { name: string; modifiers: string }) {
    window.open(
      this.utilService.getBase() +
        "print/" +
        this.utilService.getTokenQuery() +
        "&recipeId=" +
        recipe.id +
        "&template=" +
        template.name +
        "&modifiers=" +
        template.modifiers +
        "&print=true",
    );
  }

  scrapePepperplate(
    params: {
      username: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<Recipe>(
      `scrape/pepperplate`,
      "GET",
      undefined,
      params,
      errorHandlers,
    );
  }

  importFDXZ(
    fdxzFile: Blob,
    payload: {
      excludeImages?: boolean;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const formData: FormData = new FormData();
    formData.append("fdxzdb", fdxzFile);

    return this.httpService.multipartRequestWithWrapper<void>(
      "import/fdxz",
      "POST",
      formData,
      payload,
      errorHandlers,
    );
  }

  importLCB(
    lcbFile: Blob,
    payload: {
      includeStockRecipes?: boolean;
      includeTechniques?: boolean;
      excludeImages?: boolean;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    const formData: FormData = new FormData();
    formData.append("lcbdb", lcbFile);

    return this.httpService.multipartRequestWithWrapper<void>(
      "import/livingcookbook",
      "POST",
      formData,
      payload,
      errorHandlers,
    );
  }

  importPaprika(paprikaFile: Blob, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("paprikadb", paprikaFile);

    return this.httpService.multipartRequestWithWrapper<void>(
      "data/import/paprika",
      "POST",
      formData,
      undefined,
      errorHandlers,
    );
  }

  importJSONLD(jsonLDFile: Blob, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("jsonLD", jsonLDFile);

    return this.httpService.multipartRequestWithWrapper<void>(
      "data/import/json-ld",
      "POST",
      formData,
      undefined,
      errorHandlers,
    );
  }

  importCookmate(file: Blob, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append("cookmatedb", file);

    return this.httpService.multipartRequestWithWrapper<void>(
      "data/import/cookmate",
      "POST",
      formData,
      undefined,
      errorHandlers,
    );
  }

  parseIngredients(
    ingredients: string,
    scale: number,
    boldify?: boolean,
  ): ParsedIngredient[] {
    return parseIngredients(ingredients, scale, boldify);
  }

  parseInstructions(instructions: string): ParsedInstruction[] {
    return parseInstructions(instructions);
  }

  parseNotes(notes: string): ParsedNote[] {
    return parseNotes(notes);
  }
}
