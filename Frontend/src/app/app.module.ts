import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { LoadingBarModule } from '@ngx-loading-bar/core';

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
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    UserServiceProvider,
    LabelServiceProvider,
    RecipeServiceProvider,
    MessagingServiceProvider,
    LoadingServiceProvider,
    ShoppingListServiceProvider,
    WebsocketServiceProvider,
    UtilServiceProvider
  ]
})
export class AppModule {}
