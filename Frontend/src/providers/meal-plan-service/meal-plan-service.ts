import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

@Injectable()
export class MealPlanServiceProvider {

  base: any;

  constructor(public http: HttpClient) {
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

    var url = this.base + 'mealPlans/' + this.getTokenQuery();

    return this.http
      .get<any[]>(url, httpOptions)
      .pipe(
        retry(1),
        catchError(this.handleError)
      );
  }

  fetchById(mealPlanId) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return this.http
      .get<any>(this.base + 'mealPlans/' + mealPlanId + this.getTokenQuery(), httpOptions)
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
          .post(this.base + 'mealPlans/' + this.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(this.handleError)
          ).subscribe(response => {
            resolve(response);
          }, reject);
      }
    }
  }

  addItem(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
          .post(this.base + 'mealPlans/' + data.id + this.getTokenQuery(), data, httpOptions)
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
      .put(this.base + 'shoppingLists/' + data.id + this.getTokenQuery(), data, httpOptions)
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

    return {
      subscribe: (resolve, reject) => {
        this.http
          .delete(this.base + `mealPlans/${data.id}/items${this.getTokenQuery()}&itemId=${data.itemId}`, httpOptions)
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
          .delete(this.base + 'mealPlans/' + data.id + this.getTokenQuery(), httpOptions)
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
