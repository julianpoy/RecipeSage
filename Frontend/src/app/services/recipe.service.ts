import { AlertController } from '@ionic/angular';
import { Injectable } from '@angular/core';

import { Label } from './label.service';

import { HttpService } from './http.service';
import { HttpErrorHandlerService } from './http-error-handler.service';
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

  getExportURL(format) {
    return `${this.utilService.getBase()}data/export/${format}${this.utilService.getTokenQuery()}&download=true`;
  }

  count(options) {
    let url = this.utilService.getBase() + 'recipes/count' + this.utilService.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetch(options) {
    let url = this.utilService.getBase() + 'recipes/by-page' + this.utilService.getTokenQuery();
    if (options.folder)                              url += '&folder=' + options.folder;
    if (options.userId)                              url += '&userId=' + options.userId;
    if (options.sortBy)                              url += '&sort=' + options.sortBy;
    if (options.offset)                              url += '&offset=' + options.offset;
    if (options.count)                               url += '&count=' + options.count;
    if (options.labels && options.labels.length > 0) url += '&labels=' + encodeURIComponent(options.labels.join(','));
    if (options.labelIntersection)                   url += '&labelIntersection=true';

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  search(query: string, options?: { userId?: string, labels?: string[] }) {
    let url = this.utilService.getBase() + 'recipes/search' + this.utilService.getTokenQuery();
    if (options && options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');
    if (options && options.userId) url += '&userId=' + options.userId;
    url += '&query=' + query;

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(recipeId: string) {
    const url = this.utilService.getBase() + 'recipes/' + recipeId + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  async getRecipeById(recipeId: string) {
    const url = this.utilService.getBase() + `recipes/${recipeId}${this.utilService.getTokenQuery()}`;

    try {
      const { data } = await this.httpService.request({
        method: 'get',
        url
      });

      return data;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err);
    }
  }

  create(data) {
    const url = this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('recipe:created');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  share(data) {
    if (!data.destinationUserEmail) throw new Error('DestinationUserEmail required for share operation');

    const url = this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  update(data) {
    const url = this.utilService.getBase() + 'recipes/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'put',
      url,
      data
    }).then(response => {
      this.events.publish('recipe:updated');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  removeBulk(recipes) {
    const url = this.utilService.getBase() + 'recipes/delete-bulk' + this.utilService.getTokenQuery();
    const data = {
      recipeIds: recipes
    };

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('recipe:deleted');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  remove(data) {
    const url = this.utilService.getBase() + 'recipes/' + data.id + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => {
      this.events.publish('recipe:deleted');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  removeAll() {
    const url = this.utilService.getBase() + 'recipes/all' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'delete',
      url
    }).then(response => {
      this.events.publish('recipe:deleted');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  clipFromUrl(clipUrl: string) {
    const url = this.utilService.getBase() + 'clip/' + this.utilService.getTokenQuery() + '&url=' + encodeURIComponent(clipUrl);

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  print(recipe, template) {
    window.open(this.utilService.getBase() + 'print/' + this.utilService.getTokenQuery()
                + '&recipeId=' + recipe.id + '&template=' + template.name + '&modifiers=' + template.modifiers + '&print=true');
  }

  scrapePepperplate(data) {
    const url = this.utilService.getBase()
      + 'scrape/pepperplate'
      + this.utilService.getTokenQuery()
      + '&username=' + encodeURIComponent(data.username)
      + '&password=' + encodeURIComponent(data.password);

    return this.httpService.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  importFDXZ(fdxzFile, excludeImages?: boolean) {
    const formData: FormData = new FormData();
    formData.append('fdxzdb', fdxzFile, fdxzFile.name);

    const url = `${this.utilService.getBase()}import/fdxz${this.utilService.getTokenQuery()}`
      + `${excludeImages ? '&excludeImages=true' : ''}`;

    return this.httpService.request({
      method: 'post',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
    }).then(response => {
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  importLCB(lcbFile, includeStockRecipes?: boolean, includeTechniques?: boolean, excludeImages?: boolean) {
    const formData: FormData = new FormData();
    formData.append('lcbdb', lcbFile, lcbFile.name);

    const url = `${this.utilService.getBase()}import/livingcookbook${this.utilService.getTokenQuery()}`
              + `${includeStockRecipes ? '&includeStockRecipes=true' : ''}`
              + `${includeTechniques ? '&includeTechniques=true' : ''}`
              + `${excludeImages ? '&excludeImages=true' : ''}`;

    return this.httpService.request({
      method: 'post',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
    }).then(response => {
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  importPaprika(paprikaFile) {
    const formData: FormData = new FormData();
    formData.append('paprikadb', paprikaFile, paprikaFile.name);

    const url = `${this.utilService.getBase()}import/paprika${this.utilService.getTokenQuery()}`;

    return this.httpService.request({
      method: 'post',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
    }).then(response => {
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
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
