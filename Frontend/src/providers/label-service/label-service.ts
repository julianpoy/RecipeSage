import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';
import { Events } from 'ionic-angular';
import { UtilServiceProvider } from '../util-service/util-service';

export interface Label {
  id: string;
  title: string;
}

@Injectable()
export class LabelServiceProvider {

  base: any;

  constructor(public http: HttpClient, public events: Events, public utilService: UtilServiceProvider) {

  }

  fetch(populate?: boolean) {
    var populateQuery = populate ? '&populate=true' : '';

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    return this.http
    .get(this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery() + populateQuery, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  create(data) {
    return this.createBulk({
      title: data.title,
      recipeIds: [data.recipeId]
    })
  }

  createBulk(data) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    };

    return {
      subscribe: (resolve, reject) => {
        this.http
          .post(this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery(), data, httpOptions)
          .pipe(
            catchError(this.handleError)
          ).subscribe(response => {
            this.events.publish('label:created');

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
          .delete(this.utilService.getBase() + 'labels/' + this.utilService.getTokenQuery() + '&labelId=' + data.id + '&recipeId=' + data.recipeId, httpOptions)
          .pipe(
            retry(1),
            catchError(this.handleError)
          ).subscribe(response => {
            this.events.publish('label:deleted');

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
