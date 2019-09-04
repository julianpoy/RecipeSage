import { Events, AlertController } from '@ionic/angular';
import { Injectable } from '@angular/core';
import axios, { AxiosInstance } from 'axios';

import { Label } from './label.service';

import fractionjs from 'fraction.js';
import { UtilService } from './util.service';

import { parseIngredients, parseInstructions } from '../../../../SharedUtils';

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
  image: any;
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

@Injectable({
  providedIn: 'root'
})
export class RecipeService {

  base: any;

  axiosClient: AxiosInstance;

  constructor(
  public alertCtrl: AlertController,
  public events: Events,
  public utilService: UtilService) {
    this.axiosClient = axios.create({
      timeout: 3000,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  getExportURL(format) {
    return this.utilService.getBase() + 'recipes/export' + this.utilService.getTokenQuery() + '&format=' + format;
  }

  count(options) {
    let url = this.utilService.getBase() + 'recipes/count' + this.utilService.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetch(options) {
    let url = this.utilService.getBase() + 'recipes/by-page' + this.utilService.getTokenQuery();
    if (options.folder)                              url += '&folder=' + options.folder;
    if (options.sortBy)                              url += '&sort=' + options.sortBy;
    if (options.offset)                              url += '&offset=' + options.offset;
    if (options.count)                               url += '&count=' + options.count;
    if (options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');
    if (options.labelIntersection)                   url += '&labelIntersection=true';

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  search(query: string, options?: { labels?: string[] }) {
    let url = this.utilService.getBase() + 'recipes/search' + this.utilService.getTokenQuery();
    if (options && options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');
    url += '&query=' + query;

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  fetchById(recipeId: string) {
    const url = this.utilService.getBase() + 'recipes/' + recipeId + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  create(data) {
    const formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (const key of Object.keys(data)) {
      formData.append(key, data[key]);
    }

    const url = this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
    }).then(response => {
      this.events.publish('recipe:created');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  share(data) {
    if (!data.destinationUserEmail) throw new Error('DestinationUserEmail required for share operation');
    if (data.image) data.imageURL = data.image.location;

    const url = this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'post',
      url,
      data
    }).then(response => {
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
  }

  update(data) {
    const formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (const key of Object.keys(data)) {
      formData.append(key, data[key]);
    }

    const url = this.utilService.getBase() + 'recipes/' + data.id + this.utilService.getTokenQuery();

    return this.axiosClient.request({
      method: 'put',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
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

    return this.axiosClient.request({
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

    return this.axiosClient.request({
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

    return this.axiosClient.request({
      method: 'delete',
      url
    }).then(response => {
      this.events.publish('recipe:deleted');
      this.events.publish('recipe:generalUpdate');

      return response.data;
    });
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

    return this.axiosClient.request({
      method: 'get',
      url
    }).then(response => response.data);
  }

  importLCB(lcbFile, includeStockRecipes?: boolean, includeTechniques?: boolean, excludeImages?: boolean) {
    const formData: FormData = new FormData();
    formData.append('lcbdb', lcbFile, lcbFile.name);

    const url = `${this.utilService.getBase()}import/livingcookbook${this.utilService.getTokenQuery()}
                 ${includeStockRecipes ? '&includeStockRecipes=true' : ''}
                 ${includeTechniques ? '&includeTechniques=true' : ''}
                 ${excludeImages ? '&excludeImages=true' : ''}`;

    return this.axiosClient.request({
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

    return this.axiosClient.request({
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

  async scaleIngredientsPrompt(currentScale: number, cb) {
    const alert = await this.alertCtrl.create({
      header: 'Recipe Scale',
      message: 'Enter a number or fraction to scale the recipe',
      inputs: [
        {
          name: 'scale',
          value: currentScale.toString(),
          placeholder: 'Scale'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          handler: () => { }
        },
        {
          text: 'Apply',
          handler: data => {
            // Support fractions
            const parsed = fractionjs(data.scale).valueOf();
            // Trim long/repeating decimals
            let rounded = Number(parsed.toFixed(3));
            // Check for falsy values
            if (!rounded || rounded <= 0) rounded = 1;
            // Check for invalid values
            // rounded = parseFloat(rounded) || 1;
            cb(rounded);
          }
        }
      ]
    });

    alert.present();
  }
}
