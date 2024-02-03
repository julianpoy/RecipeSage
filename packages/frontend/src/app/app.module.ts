import { NgModule, ErrorHandler, Injectable } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { HttpClientModule, HttpClient } from "@angular/common/http";
import { RouteReuseStrategy } from "@angular/router";

import { IonicModule, IonicRouteStrategy } from "@ionic/angular";

import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

import { LoadingBarModule } from "@ngx-loading-bar/core";
import * as Sentry from "@sentry/browser";

import { AppComponent } from "./app.component";
import { AppRoutingModule } from "./app-routing.module";
import { DefaultPageGuardService } from "./services/default-page-guard.service";
import { UnsavedChangesGuardService } from "./services/unsaved-changes-guard.service";

import { CookingToolbarModule } from "./components/cooking-toolbar/cooking-toolbar.module";

import {
  environment,
  IS_SELFHOST,
  SENTRY_SAMPLE_RATE,
} from "../environments/environment";
import { SupportedLanguages } from "@recipesage/util";

const checkChunkLoadError = (error: Error) => {
  const chunkFailedErrorRegExp = /Loading chunk [\d]+ failed/;
  const isChunkFailedError = chunkFailedErrorRegExp.test(error.message);

  if (isChunkFailedError && !(window as any).currentChunkError) {
    (window as any).currentChunkError = true;

    const shouldReload = confirm(
      "There was a connection interruption while loading this page. Do you want to reload the application?",
    );
    if (shouldReload) {
      window.location.reload();
    }
  }

  return isChunkFailedError;
};

const checkSupressedError = (error: Error) => {
  // These errors commonly come from Ionic and/or Webpack chunk loading. We don't want to send these to Sentry and consume our budget there.
  const supressedErrorRegExp =
    /(Loading chunk [\d]+ failed)|(Cstr is undefined)|(Cannot read property 'isProxied' of undefined)|(Cannot read properties of undefined \(reading 'isProxied'\))|(\.isProxied)|(\[object Undefined\])/;

  return supressedErrorRegExp.test(error.message);
};

const origConsoleError = console.error;
console.error = (...args) => {
  try {
    checkChunkLoadError(args[0]);
  } catch (e) {}

  origConsoleError.apply(console, args);
};

if (!IS_SELFHOST) {
  Sentry.init({
    release: (window as any).version,
    environment: environment.production ? "production" : "dev",
    dsn: "https://056d11b20e624d52a5771ac8508dd0b8@sentry.io/1219200",
    tracesSampleRate: SENTRY_SAMPLE_RATE,
    beforeSend(event, hint) {
      const error = hint.originalException as Error;
      if (checkChunkLoadError(error)) return null;
      if (checkSupressedError(error)) return null;
      return event;
    },
  });
}

export function createTranslateLoader(http: HttpClient) {
  const prefix = "assets/i18n/";
  const suffix = `.json?version=${(window as any).version}`;

  return new TranslateHttpLoader(http, prefix, suffix);
}

@Injectable()
export class SentryErrorHandler extends ErrorHandler {
  handleError(error: Error) {
    super.handleError(error);

    let token: string | undefined;
    try {
      token = localStorage.getItem("token") || undefined;
    } catch (e) {}

    try {
      Sentry.addBreadcrumb({
        category: "auth",
        message: "Session: " + token,
        level: "info",
      });
      Sentry.captureException((error as any).originalError || error);
    } catch (e) {
      console.error(e);
    }
  }
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    HttpClientModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
      defaultLanguage: SupportedLanguages.EN_US,
    }),
    AppRoutingModule,
    LoadingBarModule,
    CookingToolbarModule,
  ],
  providers: [
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DefaultPageGuardService,
    UnsavedChangesGuardService,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
