import { AlertController } from "@ionic/angular/standalone";
import { Injectable, inject } from "@angular/core";

import { HttpService } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { UtilService } from "./util.service";
import { EventName, EventService } from "./event.service";
import { Image } from "./image.service";

import { System } from "unitz-ts";
import {
  parseIngredients,
  parseInstructions,
  parseNotes,
  ParsedNote,
} from "@recipesage/util/shared";

export interface Label {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  recipeCount?: number;
}

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
  plaintextContent: string;
  originalContent: string;
  htmlContent: string;
  isHeader: boolean;
  complete: boolean;
  isRtl: boolean;
}

export interface ParsedInstruction {
  content: string;
  plaintextContent: string;
  htmlContent: string;
  isHeader: boolean;
  complete: boolean;
  count: number;
  isRtl: boolean;
}

export type { ParsedNote };

export enum ExportFormat {
  PDF = "pdf",
  TXT = "txt",
  JSONLD = "jsonld",
}

@Injectable({
  providedIn: "root",
})
export class RecipeService {
  alertCtrl = inject(AlertController);
  events = inject(EventService);
  httpService = inject(HttpService);
  utilService = inject(UtilService);

  getExportURL(format: ExportFormat) {
    return `${this.utilService.getBase()}data/export/${format}${this.utilService.getTokenQuery()}&download=true`;
  }

  count(
    params: {
      folder?: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{ count: number }>({
      path: `recipes/count`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
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
    }>({
      path: `recipes/search`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  fetchById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>({
      path: `recipes/${recipeId}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  getRecipeById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>({
      path: `recipes/${recipeId}`,
      method: "GET",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });
  }

  async delete(recipeId: string, errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<void>({
      path: `recipes/${recipeId}`,
      method: "DELETE",
      payload: undefined,
      query: undefined,
      errorHandlers,
    });

    this.events.publish(EventName.RecipeDeleted);

    return response;
  }

  clipFromUrl(
    params: {
      url: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<any>({
      path: `clip`,
      method: "GET",
      payload: undefined,
      query: params,
      errorHandlers,
    });
  }

  parseIngredients(
    ingredients: string,
    scale: number,
    targetSystem?: System,
  ): ParsedIngredient[] {
    return parseIngredients(ingredients, scale, targetSystem);
  }

  parseInstructions(
    instructions: string,
    scale: number,
    targetSystem?: System,
    images?: { url: string }[],
  ): ParsedInstruction[] {
    return parseInstructions(instructions, scale, targetSystem, images);
  }

  parseNotes(notes: string, images?: { url: string }[]): ParsedNote[] {
    return parseNotes(notes, images);
  }
}
