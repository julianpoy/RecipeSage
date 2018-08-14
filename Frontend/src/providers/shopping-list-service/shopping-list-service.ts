import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

@Injectable()
export class ShoppingListServiceProvider {

  base: any;

  constructor(public http: HttpClient, public events: Events) {
    console.log('Hello ShoppingListServiceProvider Provider');

    this.base = localStorage.getItem('base') || '/api/';
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  fetch() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    var url = this.base + 'shoppingLists/' + this.getTokenQuery();

    return this.http
      .get<any[]>(url, httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  fetchById(listId) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return this.http
      .get<any>(this.base + 'shoppingLists/' + listId + this.getTokenQuery(), httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  create(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    var me = this;
    return {
      subscribe: function (resolve, reject) {
        me.http
          .post(me.base + 'shoppingLists/' + me.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(me.handleError)
          ).subscribe(function (response) {
            resolve(response);
          }, reject);
      }
    }
  }

  addItems(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    var me = this;
    return {
      subscribe: function (resolve, reject) {
        me.http
          .post(me.base + 'shoppingLists/' + data._id + me.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(me.handleError)
          ).subscribe(function (response) {
            resolve(response);
          }, reject);
      }
    }
  }

  update(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return this.http
      .put(this.base + 'shoppingLists/' + data._id + this.getTokenQuery(), data, httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  remove(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    var recipeQuery = data.recipeId ? '&recipeId=' + data.recipeId : '';

    var me = this;
    return {
      subscribe: function (resolve, reject) {
        me.http
          .delete(me.base + 'shoppingLists/' + data._id + me.getTokenQuery() + '&items=' + data.items.join(',') + recipeQuery, httpOptions)
          .pipe(
            retry(1),
            catchError(me.handleError)
          ).subscribe(function (response) {
            resolve(response);
          }, reject);
      }
    }
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
