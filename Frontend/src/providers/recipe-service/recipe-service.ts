import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { Label } from '../label-service/label-service';

export interface Recipe {
  _id: string;
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

@Injectable()
export class RecipeServiceProvider {

  base: any;

  constructor(public http: HttpClient, public events: Events) {
    console.log('Hello RecipeServiceProvider Provider');

    this.base = localStorage.getItem('base') || '/api/';
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  getExportURL(format) {
    return this.base + 'recipes/export' + this.getTokenQuery() + '&format=' + format;
  }

  fetch(options) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'recipes/' + this.getTokenQuery();
    if (options.folder) url += '&folder=' + options.folder;
    if (options.sortBy) url += '&sort=' + options.sortBy;
    if (options.labels && options.labels.length > 0) url += '&labels=' + options.labels.join(',');

    return this.http
    .get<Recipe[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  fetchById(recipeId) {
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

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .post(me.base + 'recipes/' + me.getTokenQuery(), formData, httpOptions)
        .pipe(
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:created');
          me.events.publish('recipe:generalUpdate');
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

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .post(me.base + 'recipes/' + me.getTokenQuery(), data, httpOptions)
        .pipe(
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:generalUpdate');
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

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .put(me.base + 'recipes/' + data._id + me.getTokenQuery(), formData, httpOptions)
        .pipe(
          retry(1),
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:updated');
          me.events.publish('recipe:generalUpdate');
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

    var me = this;
    return {
      subscribe: function(resolve, reject) {
        me.http
        .delete(me.base + 'recipes/' + data._id + me.getTokenQuery(), httpOptions)
        .pipe(
          retry(1),
          catchError(me.handleError)
        ).subscribe(function(response) {
          me.events.publish('recipe:deleted');
          me.events.publish('recipe:generalUpdate');
          resolve(response);
        }, reject);
      }
    }
  }

  print(recipe, template) {
    window.open(this.base + 'print/' + this.getTokenQuery() + '&recipeId=' + recipe._id + '&template=' + template + '&print=true');
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
