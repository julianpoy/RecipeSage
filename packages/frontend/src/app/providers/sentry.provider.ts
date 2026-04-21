import {
  APP_INITIALIZER,
  ErrorHandler,
  PLATFORM_ID,
  Provider,
  inject,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { Router } from "@angular/router";
import * as Sentry from "@sentry/angular";

export function provideSentry(): Provider[] {
  return [
    {
      provide: ErrorHandler,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        if (isPlatformBrowser(platformId)) {
          return Sentry.createErrorHandler();
        }
        return new ErrorHandler();
      },
    },
    {
      provide: Sentry.TraceService,
      useFactory: () => {
        const platformId = inject(PLATFORM_ID);
        if (!isPlatformBrowser(platformId)) return null;
        return new Sentry.TraceService(inject(Router));
      },
    },
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {},
      deps: [Sentry.TraceService],
      multi: true,
    },
  ];
}
