import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

export interface Label {
  _id: string;
}

@Injectable()
export class LabelServiceProvider {
  
  base: any;

  constructor(public http: HttpClient) {
    console.log('Hello LabelServiceProvider Provider');
    
    this.base = localStorage.getItem('base') || 'https://recipesage.com/api/';
  }
  
  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }
  
  fetch(populate?: boolean) {
    var populateQuery = populate ? '&populate=true' : '';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };
    
    return this.http
    .get(this.base + 'labels/' + this.getTokenQuery() + populateQuery, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  create(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .post(this.base + 'labels/' + this.getTokenQuery(), data, httpOptions)
    .pipe(
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
    .delete(this.base + 'labels/' + this.getTokenQuery() + '&labelId=' + data._id + '&recipeId=' + data.recipeId, httpOptions)
    .pipe(
      retry(1),
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
