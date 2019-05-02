import { Events, AlertController } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { Label } from '../label-service/label-service';

import fractionjs from 'fraction.js';

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
    public events: Events) {
    this.base = localStorage.getItem('base') || '/api/';
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  getExportURL(format) {
    return this.base + 'recipes/export' + this.getTokenQuery() + '&format=' + format;
  }

  count(options) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'recipes/count' + this.getTokenQuery();
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

    var url = this.base + 'recipes/by-page' + this.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;
    if (options.sortBy) url += '&sort=' + options.sortBy;
    if (options.offset) url += '&offset=' + options.offset;
    if (options.count)  url += '&count=' + options.count;
    if (options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');

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

    var url = this.base + 'recipes/search' + this.getTokenQuery();
    if (options && options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');
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
    .get<Recipe>(this.base + 'recipes/' + recipeId + this.getTokenQuery(), httpOptions)
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
        .post(this.base + 'recipes/' + this.getTokenQuery(), formData, httpOptions)
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
        .post(this.base + 'recipes/' + this.getTokenQuery(), data, httpOptions)
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
        .put(this.base + 'recipes/' + data.id + this.getTokenQuery(), formData, httpOptions)
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
        .post(this.base + 'recipes/delete-bulk' + this.getTokenQuery(), { recipeIds: recipes }, httpOptions)
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
        .delete(this.base + 'recipes/' + data.id + this.getTokenQuery(), httpOptions)
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
        .delete(this.base + 'recipes/all' + this.getTokenQuery(), httpOptions)
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
    window.open(this.base + 'print/' + this.getTokenQuery() + '&recipeId=' + recipe.id + '&template=' + template.name + '&modifiers=' + template.modifiers + '&print=true');
  }

  scrapePepperplate(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get(this.base
      + 'scrape/pepperplate'
      + this.getTokenQuery()
      + '&username=' + encodeURIComponent(data.username)
      + '&password=' + encodeURIComponent(data.password)
    , httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }

  importLCB(lcbFile, includeStockRecipes?: boolean) {
    let formData: FormData = new FormData();
    formData.append('lcbdb', lcbFile, lcbFile.name)

    const httpOptions = {};

    return {
      subscribe: (resolve, reject) => {
        this.http
        .post(`${this.base}import/livingcookbook${this.getTokenQuery()}${includeStockRecipes ? '&includeStockRecipes=true' : ''}`, formData, httpOptions)
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
        .post(`${this.base}import/paprika${this.getTokenQuery()}`, formData, httpOptions)
        .pipe(
          catchError(this.handleError)
        ).subscribe(response => {
          this.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  scaleIngredients(ingredients: string, scale: number, boldify?: boolean): Ingredient[] {
    if (!ingredients) return [];

    let lines: Ingredient[] = ingredients.match(/[^\r\n]+/g).map(match => ({
      content: match,
      originalContent: match,
      complete: false,
      isHeader: false
    }));

    // var measurementRegexp = /\d+(.\d+(.\d+)?)?/;
    var measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/;
    // Starts with [, anything inbetween, ends with ]
    var headerRegexp = /^\[.*\]$/;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].content.trim(); // Trim only spaces (no newlines)

      var measurementMatches = line.match(measurementRegexp);
      var headerMatches = line.match(headerRegexp);

      if (headerMatches && headerMatches.length > 0) {
        var header = headerMatches[0];
        var headerContent = header.substring(1, header.length - 1); // Chop off brackets

        if (boldify) headerContent = `<b class="sectionHeader">${headerContent}</b>`;
        lines[i].content = headerContent;
        lines[i].isHeader = true;
      } else if (measurementMatches && measurementMatches.length > 0) {
        var measurement = measurementMatches[0];

        try {
          var measurementParts = measurement.split(/-|to/);

          for (var j = 0; j < measurementParts.length; j++) {
            // console.log(measurementParts[j].trim())
            var scaledMeasurement = fractionjs(measurementParts[j].trim()).mul(scale);

            // Preserve original fraction format if entered
            if (measurementParts[j].indexOf('/') > -1) {
              scaledMeasurement = scaledMeasurement.toFraction(true);
            }

            if (boldify) measurementParts[j] = '<b class="ingredientMeasurement">' + scaledMeasurement + '</b>';
            else measurementParts[j] = scaledMeasurement;
          }

          lines[i].content = lines[i].content.replace(measurementRegexp, measurementParts.join(' to '));
          lines[i].isHeader = false;
        } catch (e) {
          console.log("failed to parse", e)
        }
      }
    }

    return lines;
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
