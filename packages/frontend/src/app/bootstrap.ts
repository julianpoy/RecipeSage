import * as Sentry from "@sentry/angular";
import { enableProdMode } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";

import { AppComponent } from "./app.component";
import { appConfig } from "./app.config";
import { environment } from "../environments/environment";

import { register as registerSwiperElements } from "swiper/element/bundle";

export async function bootstrap(): Promise<void> {
  registerSwiperElements();

  if (environment.production) {
    enableProdMode();
  }

  try {
    await bootstrapApplication(AppComponent, appConfig);
  } catch (err) {
    console.error(err);
    Sentry.captureException(err);
  }
}
