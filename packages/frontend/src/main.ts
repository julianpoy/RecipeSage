import * as Sentry from "@sentry/browser";

import {
  enableProdMode,
  ErrorHandler,
  importProvidersFrom,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { provideHttpClient } from "@angular/common/http";
import { provideRouter, withHashLocation } from "@angular/router";
import { IonicRouteStrategy, IonicModule } from "@ionic/angular";
import { RouteReuseStrategy } from "@angular/router";

import { AppComponent } from "./app/app.component";
import { appRoutes } from "./app/app.routes";

import { provideTranslate } from "./app/providers/translate.provider";
import { provideLoadingBar } from "./app/providers/loading-bar.provider";
import { SentryErrorHandler } from "./app/providers/sentry-error-handler.provider";

import { DefaultPageGuardService } from "./app/services/default-page-guard.service";
import { UnsavedChangesGuardService } from "./app/services/unsaved-changes-guard.service";

import { environment } from "./environments/environment";

import { register as registerSwiperElements } from "swiper/element/bundle";
registerSwiperElements();

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideRouter(appRoutes, withHashLocation()),
    importProvidersFrom(IonicModule.forRoot()),
    provideTranslate(),
    provideLoadingBar(),
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DefaultPageGuardService,
    UnsavedChangesGuardService,
  ],
}).catch((err) => {
  console.error(err);
  Sentry.captureException(err);
});
