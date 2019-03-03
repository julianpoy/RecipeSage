import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { LoadingBarModule } from '@ngx-loading-bar/core';
import * as Sentry from '@sentry/browser';

import { MyApp } from './app.component';
import { PipesModule } from '../pipes/pipes.module';

import { UserServiceProvider } from '../providers/user-service/user-service';
import { LabelServiceProvider } from '../providers/label-service/label-service';
import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../providers/messaging-service/messaging-service';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoadingServiceProvider } from '../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../providers/shopping-list-service/shopping-list-service';
import { WebsocketServiceProvider } from '../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../providers/util-service/util-service';
import { MealPlanServiceProvider } from '../providers/meal-plan-service/meal-plan-service';

Sentry.init({
  release: (<any>window).version,
  dsn: 'https://056d11b20e624d52a5771ac8508dd0b8@sentry.io/1219200'
});

export class SentryIonicErrorHandler extends IonicErrorHandler {
  handleError(error) {
    super.handleError(error);
    try {
      Sentry.captureException(error.originalError || error);
    } catch (e) {
      console.error(e);
    }
  }
}

var mode = navigator.userAgent.match(/Windows Phone/i) ? 'md' : undefined; // Force windows phone to use Material Design

@NgModule({
  declarations: [
    MyApp
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp, {
      preloadModules: true,
      mode: mode
    }),
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    BrowserAnimationsModule,
    LoadingBarModule.forRoot(),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp
  ],
  providers: [
    {provide: ErrorHandler, useClass: SentryIonicErrorHandler},
    UserServiceProvider,
    LabelServiceProvider,
    RecipeServiceProvider,
    MessagingServiceProvider,
    LoadingServiceProvider,
    ShoppingListServiceProvider,
    WebsocketServiceProvider,
    UtilServiceProvider,
    MealPlanServiceProvider
  ]
})
export class AppModule {}
