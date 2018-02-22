import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms'
import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';
import { RecipesByLabelPage } from '../pages/recipes-by-label/recipes-by-label';
import { ListPage } from '../pages/list/list';
import { LoginPage } from '../pages/login/login';
import { RecipePage } from '../pages/recipe/recipe';
import { EditRecipePage } from '../pages/edit-recipe/edit-recipe';

import { BasicFilterPipe } from '../pipes/basic-filter/basic-filter';

import { UserServiceProvider } from '../providers/user-service/user-service';
import { LabelServiceProvider } from '../providers/label-service/label-service';
import { RecipeServiceProvider } from '../providers/recipe-service/recipe-service';

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    RecipesByLabelPage,
    ListPage,
    LoginPage,
    RecipePage,
    EditRecipePage,
    BasicFilterPipe
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    HttpClientModule,
    FormsModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    RecipesByLabelPage,
    ListPage,
    LoginPage,
    RecipePage,
    EditRecipePage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    UserServiceProvider,
    LabelServiceProvider,
    RecipeServiceProvider
  ]
})
export class AppModule {}
