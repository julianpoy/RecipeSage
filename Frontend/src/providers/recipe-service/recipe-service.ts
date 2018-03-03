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
  image: any;
  imageFile: any;
  imageURL: string;
  destinationUserEmail: string;
  fromUser: any;
  folder: string;
}

@Injectable()
export class RecipeServiceProvider {

  base: any;

  constructor(public http: HttpClient) {
    console.log('Hello RecipeServiceProvider Provider');
    
    this.base = localStorage.getItem('base') || 'https://recipesage.com:3030/';
  }
  
  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }
  
  fetch(folder) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    
    var url = this.base + 'recipes/' + this.getTokenQuery();
    if (folder) url += '&folder=' + folder;
    
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

    return this.http
    .post(this.base + 'recipes/' + this.getTokenQuery(), formData, httpOptions)
    .pipe(
      catchError(this.handleError)
    );
  }
  
  share(data) {
    if (!data.destinationUserEmail) throw 'DestinationUserEmail required for share operation';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    if (data.image) data.imageURL = data.image.location;

    return this.http
    .post(this.base + 'recipes/' + this.getTokenQuery(), data, httpOptions)
    .pipe(
      catchError(this.handleError)
    );
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

    return this.http
    .put(this.base + 'recipes/' + data._id + this.getTokenQuery(), formData, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }
  
  remove(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .delete(this.base + 'recipes/' + data._id + this.getTokenQuery(), httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
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
