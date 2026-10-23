import * as Sentry from "@sentry/angular";
import "./sentry-init";

import {
  APP_INITIALIZER,
  enableProdMode,
  ErrorHandler,
  provideZoneChangeDetection,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import {
  PreloadAllModules,
  provideRouter,
  Router,
  TitleStrategy,
  withPreloading,
} from "@angular/router";
import {
  IonicRouteStrategy,
  isPlatform,
  provideIonicAngular,
} from "@ionic/angular/standalone";
import { RouteReuseStrategy } from "@angular/router";
import {
  iosTransitionAnimation,
  popoverEnterAnimation,
  popoverLeaveAnimation,
} from "@rdlabo/ionic-theme-ios27";
import { mdTransitionAnimation } from "@rdlabo/ionic-theme-md3";

import { AppComponent } from "./app/app.component";
import { appRoutes } from "./app/app.routes";

import { provideTranslate } from "./app/providers/translate.provider";
import { provideLoadingBar } from "./app/providers/loading-bar.provider";

import { UnsavedChangesGuardService } from "./app/services/unsaved-changes-guard.service";

import { environment } from "./environments/environment";

import { register as registerSwiperElements } from "swiper/element/bundle";
import { CustomTitleStrategy } from "./app/services/title.service";
registerSwiperElements();

if (environment.production) {
  enableProdMode();
}

const getThemeAnimations = () => {
  if (!isPlatform("ios")) return { navAnimation: mdTransitionAnimation };
  if (!CSS.supports("overflow-anchor: auto")) return {};

  return {
    navAnimation: iosTransitionAnimation,
    popoverEnter: popoverEnterAnimation,
    popoverLeave: popoverLeaveAnimation,
  };
};

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    { provide: TitleStrategy, useClass: CustomTitleStrategy },
    provideIonicAngular({ ...getThemeAnimations(), backButtonText: "" }),
    provideTranslate(),
    provideLoadingBar(),
    {
      provide: ErrorHandler,
      useValue: Sentry.createErrorHandler(),
    },
    {
      provide: Sentry.TraceService,
      deps: [Router],
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    UnsavedChangesGuardService,
  ],
}).catch((err) => {
  console.error(err);
  Sentry.captureException(err);
});
