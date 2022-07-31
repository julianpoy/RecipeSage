import { NgModule, ErrorHandler, Injectable } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { LoadingBarModule } from '@ngx-loading-bar/core';
import * as Sentry from '@sentry/browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DefaultPageGuardService } from './services/default-page-guard.service';
import { UnsavedChangesGuardService } from './services/unsaved-changes-guard.service';

import { CookingToolbarModule } from './components/cooking-toolbar/cooking-toolbar.module';

import { environment } from 'src/environments/environment';

const checkChunkLoadError = (error) => {
  const chunkFailedErrorRegExp = /Loading chunk [\d]+ failed/;
  const isChunkFailedError = chunkFailedErrorRegExp.test(error.message);

  if (isChunkFailedError && !(window as any).currentChunkError) {
    (window as any).currentChunkError = true;

    const shouldReload = confirm('There was a connection interruption while loading this page. Do you want to reload the application?');
    if (shouldReload) {
      window.location.reload(true);
    }
  }

  return isChunkFailedError;
}

const checkSupressedError = (error) => {
  const supressedErrorRegExp = /(Loading chunk [\d]+ failed)|(Cstr is undefined)|(Cannot read property 'isProxied' of undefined)|(\.isProxied)|(\[object Undefined\])/;

  return supressedErrorRegExp.test(error.message);
}

const origConsoleError = console.error;
console.error = (...args) => {
  try {
    checkChunkLoadError(args[0]);
  } catch(e) {}

  origConsoleError(...args);
}

Sentry.init({
  release: (window as any).version,
  environment: environment.production ? 'production' : 'dev',
  dsn: 'https://056d11b20e624d52a5771ac8508dd0b8@sentry.io/1219200',
  beforeSend(event, hint) {
    const error = hint.originalException;
    if (checkChunkLoadError(error)) return null;
    if (checkSupressedError(error)) return null;
    return event;
  }
});

export function createTranslateLoader(http: HttpClient) {
    return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@Injectable()
export class SentryErrorHandler extends ErrorHandler {
  handleError(error) {
    super.handleError(error);

    let token = '';
    try {
      token = localStorage.getItem('token');
    } catch (e) {}

    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Session: ' + token,
        level: 'info',
      });
      Sentry.captureException(error.originalError || error);
    } catch (e) {
      console.error(e);
    }
  }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    HttpClientModule,
    TranslateModule.forRoot({
        loader: {
            provide: TranslateLoader,
            useFactory: (createTranslateLoader),
            deps: [HttpClient]
        },
        defaultLanguage: 'en'
    }),
    AppRoutingModule,
    LoadingBarModule,
    CookingToolbarModule
  ],
  providers: [
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DefaultPageGuardService,
    UnsavedChangesGuardService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
