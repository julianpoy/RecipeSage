import * as firebase from 'firebase';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
// import { Observable } from 'rxjs/Observable';
import { ErrorObservable } from 'rxjs/observable/ErrorObservable';
import { Injectable } from '@angular/core';
import { catchError, retry } from 'rxjs/operators';

import { Events, ToastController, AlertController } from 'ionic-angular';

import { UserServiceProvider } from '../../providers/user-service/user-service';

export interface Message {
  _id: string;
  from: any;
  to: any;
  body: string;
  created_at: any;
  updated_at: any;
  read: boolean;
  recipe: any;
}

@Injectable()
export class MessagingServiceProvider {
  private messaging: firebase.messaging.Messaging;
  private unsubscribeOnTokenRefresh = () => {};
  private fcmToken: any;

  base: any;

  constructor(
  public http: HttpClient,
  public events: Events,
  public userService: UserServiceProvider,
  public alertCtrl: AlertController,
  public toastCtrl: ToastController) {
    console.log('Hello MessagingServiceProvider Provider');

    this.base = localStorage.getItem('base') || '/api/';

    var me = this;
    var onSWRegsitration = function() {
      console.log("Has service worker registration. Beginning setup.")
      var config = {
        messagingSenderId: "1064631313987"
      };
      firebase.initializeApp(config);

      me.messaging = firebase.messaging();
      me.messaging.useServiceWorker((<any>window).swRegistration);

      me.messaging.onMessage(function(message: any) {
        console.log("received foreground FCM: ", message)

        switch(message.data.type) {
          case 'messages:new':
            var message = JSON.parse(message.data.message);

            return me.events.publish('messages:new', message);
          case 'import:pepperplate:complete':
            return me.events.publish('import:pepperplate:complete');
          case 'import:pepperplate:failed':
            return me.events.publish('import:pepperplate:failed', message.data.reason);
          case 'import:pepperplate:working':
            return me.events.publish('import:pepperplate:working');
        }
      });
    }
    if ((<any>window).swRegistration) onSWRegsitration.call(null);
    else (<any>window).onSWRegistration = onSWRegsitration;
  }

  isNotificationsEnabled() {
    return ('Notification' in window) && ((<any>Notification).permission === 'granted');
  }

  getTokenQuery() {
    return '?token=' + localStorage.getItem('token');
  }

  fetch(from?) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'messages/' + this.getTokenQuery();
    if (from) url += '&user=' + from;

    return this.http
    .get<Message[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  threads(options?) {
    options = options || {};

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'messages/threads/' + this.getTokenQuery();
    if (!options.includeMessages) url += '&light=true';
    if (options.messageLimit) url += '&limit=' + options.messageLimit;

    return this.http
    .get<Message[]>(url, httpOptions)
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
    .post(this.base + 'messages/' + this.getTokenQuery(), data, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  markAsRead(from?) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/json'
      })
    };

    var url = this.base + 'messages/read/' + this.getTokenQuery();
    if (from) url += '&from=' + from;

    return this.http
    .get<Message[]>(url, httpOptions)
    .pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  requestNotifications() {
    if (!('Notification' in window)) return;
    if (!this.messaging || (<any>Notification).permission === 'denied') return;

    // Skip the prompt if permissions are already granted
    if ((<any>Notification).permission === 'granted') {
      this.enableNotifications();
      return;
    }

    if (!localStorage.getItem('notificationExplainationShown')) {
      localStorage.setItem('notificationExplainationShown', 'true');
      var me = this;

      let alert = this.alertCtrl.create({
        title: 'Requires Notification Permissions',
        subTitle: 'To notify you when your contacts send you messages, we need notification access.<br /><br /><b>After dismissing this popup, you will be prompted to enable notification access.</b>',
        buttons: [
          {
            text: 'Cancel'
          },
          {
            text: 'Continue',
            handler: () => {
              me.enableNotifications();
            }
          }
        ]
      });
      alert.present();
    } else {
      this.enableNotifications();
    }
  }

  // Grab token and setup FCM
  private enableNotifications() {
    if (!this.messaging) return;

    console.log('Requesting permission...');
    return this.messaging.requestPermission().then(() => {
      console.log('Permission granted');
      // token might change - we need to listen for changes to it and update it
      this.setupOnTokenRefresh();
      return this.updateToken();
    }).catch(function(err) {
      console.log('Unable to get permission to notify. ', err);
    });
  }

  public disableNotifications() {
    if (!this.messaging) return;

    var token = this.fcmToken;

    this.unsubscribeOnTokenRefresh();
    this.unsubscribeOnTokenRefresh = () => {};
    return this.userService.removeFCMToken(token).subscribe(function(response) {
      console.log("deleted FCM token", response);
    }, function(err) {
      console.log("failed to delete FCM token", err);
    });
  }

  private updateToken() {
    return this.messaging.getToken().then((currentToken) => {
      console.log("current token", currentToken)
      if (currentToken) {
        this.fcmToken = currentToken;
        console.log("saving FCM token", currentToken)
        // we've got the token from Firebase, now let's store it in the database
        return this.userService.saveFCMToken(currentToken).subscribe(function(response) {
          console.log("saved FCM token", response);
        }, function(err) {
          console.log("failed to save FCM token", err);
        });
      } else {
        console.log('No Instance ID token available. Request permission to generate one.');
      }
    }).catch(function(err) {
      console.log('Unable to get notification token. ', err);
    });
  }

  private setupOnTokenRefresh() {
    this.unsubscribeOnTokenRefresh = this.messaging.onTokenRefresh(() => {
      console.log("Token refreshed");
      this.userService.removeFCMToken(this.fcmToken).subscribe(function(response) {
        this.updateToken();
      }, function(err) {
        this.updateToken();
      });;
    });
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
