import { Events } from 'ionic-angular';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';
import { UtilServiceProvider } from '../util-service/util-service';

@Injectable()
export class ShoppingListServiceProvider {

  base: any;

  constructor(public http: HttpClient, public events: Events, public utilService: UtilServiceProvider) {
    this.base = localStorage.getItem('base') || '/api/';
  }

  fetch() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    var url = this.base + 'shoppingLists/' + this.utilService.getTokenQuery();

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
      .get<any>(this.base + 'shoppingLists/' + listId + this.utilService.getTokenQuery(), httpOptions)
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

    return {
      subscribe: (resolve, reject) => {
        this.http
          .post(this.base + 'shoppingLists/' + this.utilService.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(this.handleError)
          ).subscribe(response => {
            resolve(response);
          }, reject);
      }
    }
  }

  addItems(data: {
    id: string,
    items: {
      title: string,
      recipeId: string,
      reference: string
    }[]
  }) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
          .post(this.base + 'shoppingLists/' + data.id + this.utilService.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(this.handleError)
          ).subscribe(response => {
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
      .put(this.base + 'shoppingLists/' + data.id + this.utilService.getTokenQuery(), data, httpOptions)
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

    return {
      subscribe: (resolve, reject) => {
        this.http
          .delete(this.base + `shoppingLists/${data.id}/items${this.utilService.getTokenQuery()}&items=${data.items.join(',')}${recipeQuery}`, httpOptions)
          .pipe(
            retry(1),
            catchError(this.handleError)
          ).subscribe(response => {
            resolve(response);
          }, reject);
      }
    }
  }

  unlink(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
          .delete(this.base + 'shoppingLists/' + data.id + this.utilService.getTokenQuery(), httpOptions)
          .pipe(
            retry(1),
            catchError(this.handleError)
          ).subscribe(response => {
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
