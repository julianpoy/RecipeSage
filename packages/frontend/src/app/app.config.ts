import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  TitleStrategy,
  withPreloading,
} from "@angular/router";
import { provideHttpClient, withFetch } from "@angular/common/http";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from "@ionic/angular/standalone";

import { appRoutes } from "./app.routes";
import { provideTranslate } from "./providers/translate.provider";
import { provideLoadingBar } from "./providers/loading-bar.provider";
import { DefaultPageGuardService } from "./services/default-page-guard.service";
import { UnsavedChangesGuardService } from "./services/unsaved-changes-guard.service";
import { CustomTitleStrategy } from "./services/title.service";
import { provideSentry } from "./providers/sentry.provider";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    { provide: TitleStrategy, useClass: CustomTitleStrategy },
    provideIonicAngular(),
    provideTranslate(),
    provideLoadingBar(),
    ...provideSentry(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DefaultPageGuardService,
    UnsavedChangesGuardService,
  ],
};
