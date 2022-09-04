import { AlertController } from '@ionic/angular';
import { Injectable } from '@angular/core';

import { Label } from './label.service';

import { HttpService } from './http.service';
import { HttpErrorHandlerService, ErrorHandlers } from './http-error-handler.service';
import { UtilService } from './util.service';
import { EventService } from './event.service';
import { Image } from './image.service';

import { parseIngredients, parseInstructions, parseNotes } from '../../../../SharedUtils/src';

export interface Recipe {
  id: string;
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
  labels: Label[];
  labels_flatlist: string;
  images: Image[];
  imageFile: any;
  imageURL: string;
  destinationUserEmail: string;
  fromUser: any;
  folder: string;
  score: number;
  isOwner: boolean | null;
  updatedAt: string;
  createdAt: string;
}

export interface Ingredient {
  content: string;
  originalContent: string;
  isHeader: boolean;
  complete: boolean;
}

export interface Instruction {
  content: string;
  isHeader: boolean;
  complete: boolean;
  count: number;
}

export interface Note {
  content: string;
  isHeader: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecipeService {

  constructor(
  public alertCtrl: AlertController,
  public events: EventService,
  public httpService: HttpService,
  private httpErrorHandlerService: HttpErrorHandlerService,
  public utilService: UtilService) {}

  getExportURL(format: string) {
    return `${this.utilService.getBase()}data/export/${format}${this.utilService.getTokenQuery()}&download=true`;
  }

  count(payload: {
    folder?: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<{ count: number }>(
      `recipes/count`,
      'GET',
      payload,
      errorHandlers
    );
  }

  fetch(payload: {
    folder?: string,
    userId?: string,
    sortBy?: string,
    offset?: number,
    count?: number,
    labels?: string,
    labelIntersection?: boolean,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `recipes/by-page`,
      'GET',
      payload,
      errorHandlers
    );
  }

  search(payload: {
    query: string
    userId?: string,
    labels?: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `recipes/search`,
      'GET',
      payload,
      errorHandlers
    );
  }

  fetchById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `recipes/${recipeId}`,
      'GET',
      {},
      errorHandlers
    );
  }

  getRecipeById(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `recipes/${recipeId}`,
      'GET',
      {},
      errorHandlers
    );
  }

  async create(payload: any, errorHandlers?: ErrorHandlers) {
    const response = await this.httpService.requestWithWrapper<Recipe>(
      `recipes`,
      'POST',
      payload,
      errorHandlers
    );

    this.events.publish('recipe:created');
    this.events.publish('recipe:generalUpdate');

    return response;
  }

  share(payload: {
    destinationUserEmail: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `recipes`,
      'POST',
      payload,
      errorHandlers
    );
  }

  update(payload: any, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `recipes/${payload.id}`,
      'PUT',
      payload,
      errorHandlers
    );
  }

  deleteBulk(payload: {
    recipeIds: string[],
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `recipes/delete-bulk`,
      'POST',
      payload,
      errorHandlers
    );
  }

  delete(recipeId: string, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `recipes/${recipeId}`,
      'DELETE',
      {},
      errorHandlers
    );
  }

  deleteAll(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `recipes/all`,
      'DELETE',
      {},
      errorHandlers
    );
  }

  reindex(errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<void>(
      `recipes/reindex`,
      'POST',
      {},
      errorHandlers
    );
  }

  clipFromUrl(payload: {
    url: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<any>(
      `clip`,
      'GET',
      payload,
      errorHandlers
    );
  }

  print(recipe, template) {
    window.open(this.utilService.getBase() + 'print/' + this.utilService.getTokenQuery()
                + '&recipeId=' + recipe.id + '&template=' + template.name + '&modifiers=' + template.modifiers + '&print=true');
  }

  scrapePepperplate(payload: {
    username: string,
    password: string,
  }, errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<Recipe>(
      `scrape/pepperplate`,
      'GET',
      payload,
      errorHandlers
    );
  }

  importFDXZ(fdxzFile, payload: {
    excludeImages?: boolean,
  }, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append('fdxzdb', fdxzFile, fdxzFile.name);

    return this.httpService.multipartRequestWithWrapper<void>(
      'import/fdxz',
      'POST',
      formData,
      payload,
      errorHandlers
    );
  }

  importLCB(lcbFile, payload: {
    includeStockRecipes?: boolean,
    includeTechniques?: boolean,
    excludeImages?: boolean,
  }, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append('lcbdb', lcbFile, lcbFile.name);

    return this.httpService.multipartRequestWithWrapper<void>(
      'import/livingcookbook',
      'POST',
      formData,
      payload,
      errorHandlers
    );
  }

  importPaprika(paprikaFile, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append('paprikadb', paprikaFile, paprikaFile.name);

    return this.httpService.multipartRequestWithWrapper<void>(
      'data/import/paprika',
      'POST',
      formData,
      {},
      errorHandlers
    );
  }

  importJSONLD(jsonLDFile, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append('jsonLD', jsonLDFile, jsonLDFile.name);

    return this.httpService.multipartRequestWithWrapper<void>(
      'data/import/json-ld',
      'POST',
      formData,
      {},
      errorHandlers
    );
  }

  parseIngredients(ingredients: string, scale: number, boldify?: boolean): Ingredient[] {
    return parseIngredients(ingredients, scale, boldify);
  }

  parseInstructions(instructions: string): Instruction[] {
    return parseInstructions(instructions);
  }

  parseNotes(notes: string): Note[] {
    return parseNotes(notes);
  }
}
