import { Events, AlertController } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { Label } from '../label-service/label-service';

import fractionjs from 'fraction.js';
import { UtilServiceProvider } from '../util-service/util-service';

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

@Injectable()
export class RecipeServiceProvider {

  base: any;

  constructor(
    public http: HttpClient,
    public alertCtrl: AlertController,
    public events: Events,
    public utilService: UtilServiceProvider) {}

  getExportURL(format) {
    return this.utilService.getBase() + 'recipes/export' + this.utilService.getTokenQuery() + '&format=' + format;
  }

  count(options) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.utilService.getBase() + 'recipes/count' + this.utilService.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;

    return this.http
    .get(url, httpOptions)
    .pipe(
      retry(2),
      catchError(this.handleError)
    );
  }

  fetch(options) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.utilService.getBase() + 'recipes/by-page' + this.utilService.getTokenQuery();
    if (options.folder)                              url += '&folder=' + options.folder;
    if (options.sortBy)                              url += '&sort=' + options.sortBy;
    if (options.offset)                              url += '&offset=' + options.offset;
    if (options.count)                               url += '&count=' + options.count;
    if (options.labels && options.labels.length > 0) url += '&labels=' + encodeURIComponent(options.labels.join(','));
    if (options.labelIntersection)                   url += '&labelIntersection=true';

    return this.http
    .get<Recipe[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  search(query: string, options?: { labels?: string[] }) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.utilService.getBase() + 'recipes/search' + this.utilService.getTokenQuery();
    if (options && options.labels && options.labels.length > 0) url += '&labels=' + encodeURIComponent(options.labels.join(','));
    url += '&query=' + query;

    return this.http
    .get<Recipe[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  fetchById(recipeId: string) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get<Recipe>(this.utilService.getBase() + 'recipes/' + recipeId + this.utilService.getTokenQuery(), httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  create(data) {
    let formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (var i = 0; i < Object.keys(data).length; i++) {
      var key = Object.keys(data)[i];
      var val = data[key];

      formData.append(key, val);
    }

    const httpOptions = {};

    return {
      subscribe: (resolve, reject) => {
        this.http
        .post(this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery(), formData, httpOptions)
        .pipe(
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:created');
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  share(data) {
    if (!data.destinationUserEmail) throw 'DestinationUserEmail required for share operation';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    if (data.image) data.imageURL = data.image.location;

    return {
      subscribe: (resolve, reject) => {
        this.http
        .post(this.utilService.getBase() + 'recipes/' + this.utilService.getTokenQuery(), data, httpOptions)
        .pipe(
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  update(data) {
    let formData: FormData = new FormData();
    if (data.imageFile) formData.append('image', data.imageFile, data.imageFile.name);

    delete data.imageFile;

    for (var i = 0; i < Object.keys(data).length; i++) {
      var key = Object.keys(data)[i];
      var val = data[key];

      formData.append(key, val);
    }

    const httpOptions = {};

    return {
      subscribe: (resolve, reject) => {
        this.http
        .put(this.utilService.getBase() + 'recipes/' + data.id + this.utilService.getTokenQuery(), formData, httpOptions)
        .pipe(
          retry(1),
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:updated');
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  removeBulk(recipes) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
        .post(this.utilService.getBase() + 'recipes/delete-bulk' + this.utilService.getTokenQuery(), { recipeIds: recipes }, httpOptions)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:deleted');
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  remove(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
        .delete(this.utilService.getBase() + 'recipes/' + data.id + this.utilService.getTokenQuery(), httpOptions)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:deleted');
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  removeAll() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
        .delete(this.utilService.getBase() + 'recipes/all' + this.utilService.getTokenQuery(), httpOptions)
        .pipe(
          retry(2),
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:deleted');
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  print(recipe, template) {
    window.open(this.utilService.getBase() + 'print/' + this.utilService.getTokenQuery() + '&recipeId=' + recipe.id + '&template=' + template.name + '&modifiers=' + template.modifiers + '&print=true');
  }

  scrapePepperplate(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get(this.utilService.getBase()
      + 'scrape/pepperplate'
      + this.utilService.getTokenQuery()
      + '&username=' + encodeURIComponent(data.username)
      + '&password=' + encodeURIComponent(data.password)
    , httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }

  importLCB(lcbFile, includeStockRecipes?: boolean, includeTechniques?: boolean, excludeImages?: boolean) {
    let formData: FormData = new FormData();
    formData.append('lcbdb', lcbFile, lcbFile.name)

    const httpOptions = {};

    return {
      subscribe: (resolve, reject) => {
        this.http
          .post(`${this.utilService.getBase()}import/livingcookbook${this.utilService.getTokenQuery()}${includeStockRecipes ? '&includeStockRecipes=true' : ''}${includeTechniques ? '&includeTechniques=true' : ''}${excludeImages ? '&excludeImages=true' : ''}`, formData, httpOptions)
        .pipe(
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  importPaprika(paprikaFile) {
    let formData: FormData = new FormData();
    formData.append('paprikadb', paprikaFile, paprikaFile.name)

    const httpOptions = {};

    return {
      subscribe: (resolve, reject) => {
        this.http
        .post(`${this.utilService.getBase()}import/paprika${this.utilService.getTokenQuery()}`, formData, httpOptions)
        .pipe(
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  parseIngredients(ingredients: string, scale: number, boldify?: boolean): Ingredient[] {
    return parseIngredients(ingredients, scale, boldify);
  }

  parseInstructions(instructions: string): Instruction[] {
    return parseInstructions(instructions);
  }

  scaleIngredientsPrompt(currentScale: number, cb) {
    let alert = this.alertCtrl.create({
      title: 'Recipe Scale',
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
            let parsed = fractionjs(data.scale).valueOf();
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

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // return an ErrorObservable with a user-facing error message
    return new ErrorObservable({
      msg: 'Something bad happened; please try again later.',
      status: error.status
    });
  }
}
