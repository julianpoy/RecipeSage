import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { MyApp } from './app.component';
import { PipesModule } from '../pipes/pipes.module';

import { UserServiceProvider } from '../providers/user-service/user-service';
import { LabelServiceProvider } from '../providers/label-service/label-service';
import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';
import { MessagingServiceProvider } from '../providers/messaging-service/messaging-service';

import { TagInputModule } from 'ngx-chips';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    MyApp
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    TagInputModule,
    BrowserAnimationsModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    UserServiceProvider,
    LabelServiceProvider,
    RecipeServiceProvider,
    MessagingServiceProvider
  ]
})
export class AppModule {}
